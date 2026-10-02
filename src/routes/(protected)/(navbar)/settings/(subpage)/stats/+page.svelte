<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { t } from "$lib/i18n";
	import {
		computeUsageStats,
		STATS_PERIOD_DAYS,
		type StatsPeriodDays,
	} from "$lib/stats/compute";
	import { usageEvents } from "$lib/stats/event-log";
	import {
		formatDuration,
		formatHour,
		formatPercent,
		formatSeconds,
	} from "$lib/stats/format";
	import type { UsageEvent } from "$lib/stats/events";

	let events = $state<UsageEvent[] | null>(null);
	let days = $state<StatsPeriodDays>(7);
	let clearOpen = $state(false);

	onMount(() => {
		void usageEvents.all().then((all) => (events = all));
	});

	const stats = $derived(
		events === null
			? null
			: computeUsageStats(events, { now: Date.now(), days }),
	);
	const peakHourly = $derived(Math.max(1, ...(stats?.hourly ?? [])));
	const deckTotal = $derived(
		stats
			? stats.deck.hide +
					stats.deck.skip +
					stats.deck.like +
					stats.deck.superlike +
					stats.deck.favorite
			: 0,
	);

	async function clearAll() {
		try {
			await usageEvents.clear();
			events = [];
		} catch (error) {
			console.error(error);
			toast.error(t("stats.clearFailed"));
		}
	}
</script>

<div class="flex w-full p-4 pb-nav-clear">
	<div class="m-auto flex w-full max-w-120 flex-col gap-4">
		<div
			role="radiogroup"
			aria-label={t("stats.period")}
			class="flex items-center gap-1.5"
		>
			{#each STATS_PERIOD_DAYS as option (option)}
				<button
					type="button"
					role="radio"
					aria-checked={option === days}
					class="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
					onclick={() => (days = option)}
				>
					{t("stats.lastDays", { n: option })}
				</button>
			{/each}
		</div>

		{#if stats === null}
			<Skeleton class="h-40 w-full" />
		{:else if !stats.hasData}
			<div
				class="flex flex-col gap-1 rounded-2xl border border-border p-4"
				data-slot="stats-empty"
			>
				<p class="font-medium">{t("stats.empty")}</p>
				<p class="text-sm text-muted-foreground">
					{t("stats.emptyHint")}
				</p>
			</div>
		{:else}
			<section
				class="grid grid-cols-2 gap-2"
				aria-label={t("stats.messages")}
			>
				{@render tile(t("stats.sent"), String(stats.sent))}
				{@render tile(t("stats.received"), String(stats.received))}
				{@render tile(
					t("stats.started"),
					String(stats.conversationsStarted),
				)}
				{@render tile(
					t("stats.replyRate"),
					stats.replyRate === null
						? "—"
						: formatPercent(stats.replyRate),
				)}
				{@render tile(
					t("stats.replyTime"),
					stats.medianReplyMs === null
						? "—"
						: formatDuration(stats.medianReplyMs),
				)}
				{@render tile(
					t("stats.activeTime"),
					formatSeconds(stats.activeSeconds),
					t("stats.sessions", { n: stats.sessions }),
				)}
			</section>

			<section
				class="flex flex-col gap-2 rounded-2xl border border-border p-4"
			>
				<h2 class="text-sm font-semibold">{t("stats.hours")}</h2>
				{#if stats.busiestHour !== null}
					<p class="text-sm text-muted-foreground">
						{t("stats.busiest", {
							hour: formatHour(stats.busiestHour),
						})}
					</p>
				{/if}
				<div
					class="flex h-24 items-end gap-0.5"
					role="img"
					aria-label={t("stats.hoursChart")}
				>
					{#each stats.hourly as count, hour (hour)}
						<div
							class={[
								"min-h-0.5 flex-1 rounded-sm bg-primary/35",
								{ "bg-primary!": hour === stats.busiestHour },
							]}
							style:height="{(count / peakHourly) * 100}%"
							title="{formatHour(hour)} · {count}"
						></div>
					{/each}
				</div>
				<div
					class="flex justify-between text-3xs text-muted-foreground"
					aria-hidden="true"
				>
					<span>00</span><span>06</span><span>12</span><span>18</span
					><span>23</span>
				</div>
			</section>

			<section
				class="flex flex-col gap-2 rounded-2xl border border-border p-4"
			>
				<h2 class="text-sm font-semibold">{t("stats.carrousel")}</h2>
				{#if deckTotal === 0}
					<p class="text-sm text-muted-foreground">
						{t("stats.carrouselNone")}
					</p>
				{:else}
					<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
						{@render row(
							t("browse.tinder.reject"),
							stats.deck.hide,
						)}
						{@render row(t("browse.tinder.skip"), stats.deck.skip)}
						{@render row(t("browse.tinder.like"), stats.deck.like)}
						{@render row(
							t("browse.tinder.superlike"),
							stats.deck.superlike,
						)}
						{@render row(
							t("browse.tinder.favorite"),
							stats.deck.favorite,
						)}
					</dl>
				{/if}
			</section>
		{/if}

		<p class="text-xs text-muted-foreground">{t("stats.privacy")}</p>
		<Button
			variant="outline"
			disabled={events === null || events.length === 0}
			onclick={() => (clearOpen = true)}
		>
			{t("stats.clear")}
		</Button>
	</div>
</div>

{#snippet tile(label: string, value: string, hint?: string)}
	<div class="flex flex-col gap-0.5 rounded-2xl border border-border p-3">
		<span class="text-xs text-muted-foreground">{label}</span>
		<span class="text-2xl font-semibold tabular-nums">{value}</span>
		{#if hint}
			<span class="text-xs text-muted-foreground">{hint}</span>
		{/if}
	</div>
{/snippet}

{#snippet row(label: string, value: number)}
	<dt class="text-muted-foreground">{label}</dt>
	<dd class="text-end font-medium tabular-nums">{value}</dd>
{/snippet}

<AlertDialog.Root bind:open={clearOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t("stats.clearTitle")}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("stats.clearBody")}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">
				{t("common.cancel")}
			</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => void clearAll()}
			>
				{t("common.delete")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
