<script lang="ts">
	import { goto } from "$app/navigation";
	import { BellIcon, SlidersHorizontalIcon } from "phosphor-svelte";
	import { onMount, untrack } from "svelte";

	import {
		hydratePreferences,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { getOrCreateConversationsState } from "$lib/chat/conversations-context.svelte";
	import RelativeTimeDynamic from "$lib/components/shared/RelativeTimeDynamic.svelte";
	import { Button } from "$lib/components/ui/button";
	import { gridState } from "$lib/grid/grid-state.svelte";
	import { savedFilters } from "$lib/grid/saved-filters-state.svelte";
	import { t } from "$lib/i18n";
	import { previewLabel } from "$lib/model/messaging/message-preview";
	import { normalizeNotificationModules } from "$lib/model/notification-modules";
	import { computeUsageStats } from "$lib/stats/compute";
	import { usageEvents } from "$lib/stats/event-log";
	import { formatHour, formatPercent } from "$lib/stats/format";
	import {
		mondayKey,
		shouldShowWeekly,
		topConversation,
	} from "$lib/stats/weekly";
	import type { UsageEvent } from "$lib/stats/events";

	let { data }: { data: { ourProfileId: number } } = $props();

	const preferencesHydrated = hydratePreferences();
	const modules = $derived(
		normalizeNotificationModules(preferencesSnapshot().notificationModules),
	);
	const geohash = $derived(preferencesSnapshot().geohash);

	const conversations = untrack(() =>
		getOrCreateConversationsState(data.ourProfileId),
	);
	const unread = $derived(
		conversations.entries
			.filter((entry) => entry.data.unreadCount > 0)
			.toSorted(
				(a, b) =>
					b.data.lastActivityTimestamp - a.data.lastActivityTimestamp,
			)
			.slice(0, 8),
	);
	const unreadTotal = $derived(
		conversations.entries.filter((entry) => entry.data.unreadCount > 0)
			.length,
	);

	let events = $state<UsageEvent[] | null>(null);
	onMount(() => {
		void usageEvents.all().then((all) => (events = all));
		if (geohash) void savedFilters.check({ geohash });
	});
	const weekly = $derived(
		events === null
			? null
			: computeUsageStats(events, { now: Date.now(), days: 7 }),
	);

	// Resumen de los lunes: se enseña una vez por semana hasta que se oculta.
	const showWeeklyCard = $derived(
		weekly !== null &&
			shouldShowWeekly({
				now: new Date(),
				dismissedWeek: preferencesSnapshot().weeklyDismissedWeek,
				hasData: weekly.hasData,
			}),
	);
	const topChat = $derived.by(() => {
		if (events === null) return null;
		const top = topConversation(events, { now: Date.now(), days: 7 });
		if (top === null) return null;
		const entry = conversations.entries.find(
			(item) => item.data.conversationId === top.conversationId,
		);
		return { name: entry?.data.name ?? null, sent: top.sent };
	});

	function dismissWeekly() {
		setPreferences({ weeklyDismissedWeek: mondayKey(new Date()) }).catch(
			console.error,
		);
	}

	async function openSavedFilter(id: string) {
		const saved = savedFilters.items.find((item) => item.id === id);
		if (!saved) return;
		gridState.filters.set(structuredClone(saved.filters));
		void savedFilters.markViewed(id).catch(console.error);
		await goto("/");
	}

	const shortcuts = [
		{ href: "/right-now", label: () => t("nav.rightNow") },
		{ href: "/carrousel", label: () => t("nav.carrousel") },
		{ href: "/map", label: () => t("notifications.map") },
		{ href: "/settings/albums", label: () => t("notifications.albums") },
		{ href: "/settings/stats", label: () => t("stats.title") },
	] as const;
</script>

<svelte:head>
	<title>{t("nav.notifications")}</title>
</svelte:head>
{#await preferencesHydrated then}
	<main class="screen-nav-host">
		<div class="pull-scroller">
			<div
				class="flex w-full flex-col gap-3 p-4 pt-fixed-header pb-nav-clear"
			>
				<div class="mx-auto flex w-full max-w-120 flex-col gap-3">
					<header class="flex items-center justify-between gap-3">
						<h1
							class="flex items-center gap-2 text-xl font-semibold"
						>
							<BellIcon
								weight="fill"
								class="size-6 text-primary"
							/>
							{t("nav.notifications")}
						</h1>
						<Button
							variant="secondary"
							size="icon"
							aria-label={t("notifications.customize")}
							onclick={() => void goto("/settings/navigation")}
						>
							<SlidersHorizontalIcon />
						</Button>
					</header>

					{#if showWeeklyCard && weekly}
						<section
							class="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-3"
							data-slot="weekly-summary"
						>
							<div
								class="flex items-center justify-between gap-2"
							>
								<h2 class="text-sm font-semibold">
									{t("weekly.title")}
								</h2>
								<Button
									variant="ghost"
									size="sm"
									onclick={dismissWeekly}
								>
									{t("weekly.dismiss")}
								</Button>
							</div>
							<ul class="flex flex-col gap-1 text-sm">
								<li>
									{t("weekly.messages", {
										sent: weekly.sent,
										received: weekly.received,
									})}
								</li>
								{#if weekly.replyRate !== null}
									<li>
										{t("weekly.replyRate", {
											rate: formatPercent(
												weekly.replyRate,
											),
										})}
									</li>
								{/if}
								{#if topChat}
									<li>
										{t("weekly.topChat", {
											name:
												topChat.name ??
												t("search.unknownChat"),
											n: topChat.sent,
										})}
									</li>
								{/if}
								{#if weekly.busiestHour !== null}
									<li>
										{t("stats.busiest", {
											hour: formatHour(
												weekly.busiestHour,
											),
										})}
									</li>
								{/if}
							</ul>
						</section>
					{/if}

					{#each modules as module (module)}
						{#if module === "unanswered"}
							<section
								class="flex flex-col gap-2 rounded-2xl border border-border p-3"
								data-slot="notifications-unanswered"
							>
								<h2 class="text-sm font-semibold">
									{t("notifications.unread")}
									{#if unreadTotal > 0}
										<span class="text-muted-foreground"
											>· {unreadTotal}</span
										>
									{/if}
								</h2>
								{#if unread.length === 0}
									<p class="text-sm text-muted-foreground">
										{t("notifications.unreadNone")}
									</p>
								{:else}
									<ul class="flex flex-col">
										{#each unread as entry (entry.data.conversationId)}
											<li>
												<a
													href="/chat/{entry.data
														.conversationId}"
													class="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-muted/70"
												>
													<span
														class="flex min-w-0 flex-col"
													>
														<span
															class="truncate text-sm font-medium"
														>
															{entry.data.name ??
																t(
																	"search.unknownChat",
																)}
														</span>
														<span
															class="truncate text-xs text-muted-foreground"
														>
															{previewLabel(
																entry.data
																	.preview,
															) ?? ""}
														</span>
													</span>
													<span
														class="flex shrink-0 flex-col items-end gap-0.5 text-xs text-muted-foreground"
													>
														<RelativeTimeDynamic
															date={entry.data
																.lastActivityTimestamp}
														/>
														<span
															class="rounded-full bg-primary px-1.5 text-3xs font-semibold text-primary-foreground"
														>
															{entry.data
																.unreadCount}
														</span>
													</span>
												</a>
											</li>
										{/each}
									</ul>
								{/if}
							</section>
						{:else if module === "savedFilters"}
							<section
								class="flex flex-col gap-2 rounded-2xl border border-border p-3"
								data-slot="notifications-saved-filters"
							>
								<div class="flex items-center justify-between">
									<h2 class="text-sm font-semibold">
										{t("savedFilters.title")}
									</h2>
									{#if geohash && savedFilters.items.length > 0}
										<Button
											variant="ghost"
											size="sm"
											disabled={savedFilters.checking}
											onclick={() =>
												void savedFilters.check({
													geohash,
													force: true,
												})}
										>
											{t("notifications.checkNow")}
										</Button>
									{/if}
								</div>
								{#if savedFilters.items.length === 0}
									<p class="text-sm text-muted-foreground">
										{t("notifications.filtersNone")}
									</p>
								{:else}
									<ul class="flex flex-col">
										{#each savedFilters.items as saved (saved.id)}
											{@const fresh =
												savedFilters.newCounts[
													saved.id
												] ?? 0}
											<li>
												<button
													type="button"
													class="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-start hover:bg-muted/70"
													onclick={() =>
														void openSavedFilter(
															saved.id,
														)}
												>
													<span
														class="truncate text-sm font-medium"
													>
														{saved.name}
													</span>
													<span
														class="shrink-0 text-xs text-muted-foreground"
													>
														{#if !saved.baselineSet}
															{t(
																"savedFilters.pending",
															)}
														{:else if fresh > 0}
															{t(
																"savedFilters.new",
																{ n: fresh },
															)}
														{:else}
															{t(
																"savedFilters.none",
															)}
														{/if}
													</span>
												</button>
											</li>
										{/each}
									</ul>
								{/if}
							</section>
						{:else if module === "stats"}
							<section
								class="flex flex-col gap-2 rounded-2xl border border-border p-3"
								data-slot="notifications-stats"
							>
								<div class="flex items-center justify-between">
									<h2 class="text-sm font-semibold">
										{t("notifications.week")}
									</h2>
									<a
										href="/settings/stats"
										class="text-xs text-primary"
									>
										{t("notifications.seeAll")}
									</a>
								</div>
								{#if weekly && weekly.hasData}
									<dl
										class="grid grid-cols-3 gap-2 text-center"
									>
										<div>
											<dd
												class="text-xl font-semibold tabular-nums"
											>
												{weekly.sent}
											</dd>
											<dt
												class="text-xs text-muted-foreground"
											>
												{t("stats.sent")}
											</dt>
										</div>
										<div>
											<dd
												class="text-xl font-semibold tabular-nums"
											>
												{weekly.received}
											</dd>
											<dt
												class="text-xs text-muted-foreground"
											>
												{t("stats.received")}
											</dt>
										</div>
										<div>
											<dd
												class="text-xl font-semibold tabular-nums"
											>
												{weekly.replyRate === null
													? "—"
													: formatPercent(
															weekly.replyRate,
														)}
											</dd>
											<dt
												class="text-xs text-muted-foreground"
											>
												{t("stats.replyRate")}
											</dt>
										</div>
									</dl>
								{:else}
									<p class="text-sm text-muted-foreground">
										{t("stats.empty")}
									</p>
								{/if}
							</section>
						{:else if module === "shortcuts"}
							<section
								class="flex flex-col gap-2 rounded-2xl border border-border p-3"
								data-slot="notifications-shortcuts"
							>
								<h2 class="text-sm font-semibold">
									{t("notifications.shortcuts")}
								</h2>
								<div class="flex flex-wrap gap-2">
									{#each shortcuts as shortcut (shortcut.href)}
										<Button
											variant="secondary"
											size="sm"
											href={shortcut.href}
										>
											{shortcut.label()}
										</Button>
									{/each}
								</div>
							</section>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	</main>
{/await}
