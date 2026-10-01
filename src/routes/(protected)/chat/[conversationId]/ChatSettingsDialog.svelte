<script lang="ts">
	import { StarIcon } from "phosphor-svelte";

	import {
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import {
		starredInConversation,
		toggleStarred,
	} from "$lib/chat/starred-state.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { Switch } from "$lib/components/ui/switch";
	import { t } from "$lib/i18n";
	import { conversationStats } from "$lib/stats/conversation-stats";
	import { usageEvents } from "$lib/stats/event-log";
	import type { UsageEvent } from "$lib/stats/events";
	import { formatDuration, formatPercent } from "$lib/stats/format";

	let {
		open = $bindable(false),
		conversationId,
	}: { open: boolean; conversationId: string } = $props();

	// Las estadísticas de un chat solo se calculan y se enseñan si se activan aquí.
	const statsOn = $derived(
		preferencesSnapshot().chatStatsEnabled.includes(conversationId),
	);
	const starred = $derived(starredInConversation(conversationId));

	let events = $state<UsageEvent[] | null>(null);
	$effect(() => {
		if (!open || !statsOn) {
			events = null;
			return;
		}
		void usageEvents.all().then((all) => (events = all));
	});
	const stats = $derived(
		events === null
			? null
			: conversationStats(events, { conversationId, now: Date.now() }),
	);

	function setStats(on: boolean) {
		const current = preferencesSnapshot().chatStatsEnabled;
		const next = on
			? [...new Set([...current, conversationId])]
			: current.filter((id) => id !== conversationId);
		setPreferences({ chatStatsEnabled: next }).catch(console.error);
	}
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="max-h-[calc(var(--screen-safe)-4rem)] sm:max-w-md"
		drawerClass="max-h-screen-safe"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title
				>{t("chatSettings.title")}</ResponsiveDialog.Title
			>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="chat-settings"
			class="flex flex-col gap-4"
			dialogClass="-mx-1 px-1"
			drawerClass="px-4 pb-4"
		>
			<section
				class="flex flex-col gap-2"
				data-slot="chat-settings-stats"
			>
				<div class="flex items-center justify-between gap-3">
					<div class="flex min-w-0 flex-col">
						<span class="text-sm font-semibold"
							>{t("chatSettings.stats")}</span
						>
						<span class="text-xs text-muted-foreground">
							{t("chatSettings.statsHint")}
						</span>
					</div>
					<Switch
						checked={statsOn}
						aria-label={t("chatSettings.stats")}
						onCheckedChange={setStats}
					/>
				</div>
				{#if statsOn && stats}
					{#if !stats.hasData}
						<p class="text-sm text-muted-foreground">
							{t("chatSettings.statsNone")}
						</p>
					{:else}
						<dl class="grid grid-cols-2 gap-2 text-sm">
							<div class="rounded-xl border border-border p-2">
								<dt class="text-xs text-muted-foreground">
									{t("stats.sent")}
								</dt>
								<dd class="text-lg font-semibold tabular-nums">
									{stats.sent}
								</dd>
							</div>
							<div class="rounded-xl border border-border p-2">
								<dt class="text-xs text-muted-foreground">
									{t("stats.received")}
								</dt>
								<dd class="text-lg font-semibold tabular-nums">
									{stats.received}
								</dd>
							</div>
							<div class="rounded-xl border border-border p-2">
								<dt class="text-xs text-muted-foreground">
									{t("stats.replyRate")}
								</dt>
								<dd class="text-lg font-semibold">
									{stats.replyRate === null
										? "—"
										: formatPercent(stats.replyRate)}
								</dd>
							</div>
							<div class="rounded-xl border border-border p-2">
								<dt class="text-xs text-muted-foreground">
									{t("stats.replyTime")}
								</dt>
								<dd class="text-lg font-semibold">
									{stats.medianReplyMs === null
										? "—"
										: formatDuration(stats.medianReplyMs)}
								</dd>
							</div>
						</dl>
						{#if stats.firstAt !== null}
							<p class="text-xs text-muted-foreground">
								{stats.startedByMe
									? t("chatSettings.startedByYou", {
											date: new Date(
												stats.firstAt,
											).toLocaleDateString(),
										})
									: t("chatSettings.startedByThem", {
											date: new Date(
												stats.firstAt,
											).toLocaleDateString(),
										})}
							</p>
						{/if}
					{/if}
				{/if}
			</section>

			<section
				class="flex flex-col gap-2"
				data-slot="chat-settings-starred"
			>
				<h3 class="text-sm font-semibold">
					{t("chatSettings.starred")}
				</h3>
				{#if starred.length === 0}
					<p class="text-sm text-muted-foreground">
						{t("chatSettings.starredNone")}
					</p>
				{:else}
					<ul class="flex flex-col gap-1">
						{#each starred as item (item.messageId)}
							<li
								class="flex items-start justify-between gap-2 rounded-xl border border-border p-2"
							>
								<div class="flex min-w-0 flex-col">
									<span class="text-sm wrap-anywhere">
										{item.text ??
											t("chatSettings.starredMedia")}
									</span>
									<span class="text-xs text-muted-foreground">
										{new Date(
											item.timestamp,
										).toLocaleString()}
									</span>
								</div>
								<Button
									variant="ghost"
									size="icon"
									aria-label={t("chatSettings.unstar")}
									onclick={() =>
										void toggleStarred({
											conversationId: item.conversationId,
											messageId: item.messageId,
											text: item.text,
											timestamp: item.timestamp,
										})}
								>
									<StarIcon
										weight="fill"
										class="text-yellow-500"
									/>
								</Button>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
