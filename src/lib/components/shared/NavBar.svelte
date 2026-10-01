<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import BellIcon from "phosphor-svelte/lib/BellIcon";
	import ChatCircleIcon from "phosphor-svelte/lib/ChatCircleIcon";
	import DiceFiveIcon from "phosphor-svelte/lib/DiceFiveIcon";
	import DotsNineIcon from "phosphor-svelte/lib/DotsNineIcon";
	import FireIcon from "phosphor-svelte/lib/FireIcon";
	import LightningIcon from "phosphor-svelte/lib/LightningIcon";
	import MapTrifoldIcon from "phosphor-svelte/lib/MapTrifoldIcon";
	import { untrack } from "svelte";
	import type { Component } from "svelte";

	import { getProfile } from "$lib/api/users/profiles";
	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import { getOrCreateConversationsState } from "$lib/chat/conversations-context.svelte";
	import BrokenUserAvatar from "$lib/components/profile/BrokenUserAvatar.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import ProgressiveBlur from "$lib/components/shared/ProgressiveBlur.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { navBadge } from "./nav-badge";
	import { tabsListVariants } from "$lib/components/ui/tabs";
	import { savedFilters } from "$lib/grid/saved-filters-state.svelte";
	import { t } from "$lib/i18n";
	import { getTapsState } from "$lib/interest/taps-state.svelte";
	import { type NavTabId, normalizeNavTabs } from "$lib/model/nav-tabs";
	import { traverseBackTo } from "$lib/util/history";
	import { isWithin } from "$lib/util/pathname";
	import { isPlainClick } from "$lib/util/plain-click";
	import { bottomChrome } from "$lib/util/screen-chrome.svelte";

	let { ourProfileId }: { ourProfileId: number } = $props();

	const myProfilePhotos = untrack(() =>
		getProfile(ourProfileId).then((profile) => profile.medias),
	);

	const conversations = untrack(() =>
		getOrCreateConversationsState(ourProfileId),
	);
	const hasUnread = $derived(conversations.hasUnread);

	const taps = untrack(() => getTapsState(ourProfileId));
	const hasUnseenTaps = $derived(taps.hasUnseen);

	// Hay novedades en Notificaciones: chats sin leer o filtros guardados con gente nueva.
	const hasNews = $derived(hasUnread || savedFilters.totalNew > 0);

	// Conversaciones con mensajes sin leer, para el número de la insignia.
	const unreadChats = $derived(
		conversations.entries.filter((entry) => entry.data.unreadCount > 0)
			.length,
	);

	type TabDefinition = {
		href: string;
		landsOn?: string;
		isActive: (routeId: string | null) => boolean;
		icon: Component<{ weight?: "fill" }>;
		label: () => string;
		badge?: () => ReturnType<typeof navBadge>;
	};

	const tabs: Record<NavTabId, TabDefinition> = {
		browse: {
			href: "/",
			isActive: (id) => id === "/(protected)/(navbar)/(root)",
			icon: DotsNineIcon,
			label: () => t("nav.browse"),
		},
		carrousel: {
			href: "/carrousel",
			isActive: (id) => id === "/(protected)/(navbar)/carrousel",
			icon: DiceFiveIcon,
			label: () => t("nav.carrousel"),
		},
		rightNow: {
			href: "/right-now",
			isActive: (id) => id === "/(protected)/(navbar)/right-now",
			icon: LightningIcon,
			label: () => t("nav.rightNow"),
		},
		interest: {
			href: "/interest",
			landsOn: "/interest/taps",
			isActive: (id) =>
				id?.startsWith("/(protected)/(navbar)/interest") ?? false,
			icon: FireIcon,
			label: () => t("nav.interest"),
			// De los toques solo se sabe si hay alguno sin ver: punto, sin número.
			badge: () => navBadge({ count: 0, pending: hasUnseenTaps }),
		},
		chat: {
			href: "/chat",
			isActive: (id) => id === "/(protected)/chat",
			icon: ChatCircleIcon,
			label: () => t("nav.inbox"),
			badge: () => navBadge({ count: unreadChats, pending: hasUnread }),
		},
		map: {
			href: "/map",
			// El mapa es una pantalla completa con su propia cabecera: no muestra la barra.
			isActive: () => false,
			icon: MapTrifoldIcon,
			label: () => t("nav.map"),
		},
		notifications: {
			href: "/notifications",
			isActive: (id) => id === "/(protected)/(navbar)/notifications",
			icon: BellIcon,
			label: () => t("nav.notifications"),
			badge: () =>
				navBadge({
					count: unreadChats + savedFilters.totalNew,
					pending: hasNews,
				}),
		},
	};

	const visibleTabs = $derived(
		normalizeNavTabs(preferencesSnapshot().navTabs),
	);

	// La barra es fija y no se desplaza: si cada botón tiene sitio para su
	// título se muestra; si no, quedan solo los iconos.
	const MIN_LABEL_WIDTH_PX = 76;
	let islandWidth = $state(0);
	const showLabels = $derived(
		islandWidth === 0 ||
			islandWidth / visibleTabs.length >= MIN_LABEL_WIDTH_PX,
	);

	function tabNavigation({
		href,
		landsOn = href,
	}: {
		href: string;
		landsOn?: string;
	}) {
		return (event: MouseEvent) => {
			if (!isPlainClick(event)) return;

			const current = page.url.pathname;
			if (current === landsOn) {
				event.preventDefault();
				return;
			}
			if (!isWithin({ pathname: current, root: href })) return;

			event.preventDefault();
			if (!traverseBackTo(landsOn))
				void goto(landsOn, { replaceState: true });
		};
	}
</script>

<ProgressiveBlur
	direction="bottomToTop"
	tag="nav"
	aria-label="Main"
	class="app-nav fixed bottom-0 z-50 w-full pt-2 pb-fixed-nav"
	bgClass="bg-linear-to-t from-background to-transparent"
	contentClass="flex items-center gap-2 px-2"
	{@attach bottomChrome}
>
	<div
		class={[
			tabsListVariants({ variant: "default" }),
			"app-nav-island links mx-auto max-w-xl min-w-0 flex-1 [&>a>svg]:size-5!",
		]}
		bind:clientWidth={islandWidth}
	>
		{#each visibleTabs as id (id)}
			{@const tab = tabs[id]}
			{@const active = tab.isActive(page.route.id)}
			{@const badge = tab.badge?.() ?? null}
			<a
				href={tab.href}
				aria-current={active ? "page" : undefined}
				data-active={active}
				data-tab={id}
				aria-label={showLabels ? undefined : tab.label()}
				title={showLabels ? undefined : tab.label()}
				onclick={tabNavigation({
					href: tab.href,
					landsOn: tab.landsOn,
				})}
			>
				<tab.icon weight="fill" />
				{#if showLabels}
					<span class="max-w-full truncate">{tab.label()}</span>
				{/if}
				{#if badge}
					<Badge
						data-slot="nav-badge"
						class={[
							"app-nav-badge-live absolute inset-e-2 top-1 rounded-full p-0",
							{
								"size-2.5": badge.kind === "dot",
								"h-4 min-w-4 px-1 text-3xs leading-none":
									badge.kind === "number",
							},
						]}
					>
						{#if badge.kind === "number"}
							{badge.label}
							<span class="sr-only">{t("nav.badgeSr")}</span>
						{/if}
					</Badge>
				{/if}
			</a>
		{/each}
	</div>
	<a
		href="/settings"
		aria-label={t("nav.me")}
		onclick={tabNavigation({ href: "/settings" })}
		class={[
			"app-nav-profile flex size-14 shrink-0 rounded-full border bg-muted p-1",
			{
				"border-2 border-accent":
					page.route.id === "/(protected)/(navbar)/settings/(me)",
				"border-border":
					page.route.id !== "/(protected)/(navbar)/settings/(me)",
			},
		]}
	>
		{#await myProfilePhotos then photos}
			{@const mainPhoto = photos[0] as { mediaHash: string } | undefined}
			<UserAvatar
				mediaHash={mainPhoto?.mediaHash ?? null}
				class="size-full *:rounded-full"
				size="lg"
			/>
		{:catch}
			<BrokenUserAvatar />
		{/await}
	</a>
</ProgressiveBlur>

<style lang="postcss">
	@reference "$layout";

	.links a {
		@apply relative inline-flex h-[calc(100%-1px)] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full border border-transparent! px-3 py-1.5 text-overline whitespace-nowrap text-foreground/55 uppercase transition-colors duration-200 ease-out group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-1.5 hover:bg-input/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:bg-input/20 data-active:bg-(--accent-soft) data-active:font-semibold data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5;
	}

	.app-nav-profile {
		transition:
			transform var(--motion-normal) var(--ease-standard),
			border-color var(--motion-normal) var(--ease-standard);
	}

	@media (hover: hover) and (pointer: fine) {
		.app-nav-profile:hover {
			transform: translateY(-1px);
		}
	}
</style>
