<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import ChatCircleIcon from "phosphor-svelte/lib/ChatCircleIcon";
	import DiceFiveIcon from "phosphor-svelte/lib/DiceFiveIcon";
	import DotsNineIcon from "phosphor-svelte/lib/DotsNineIcon";
	import FireIcon from "phosphor-svelte/lib/FireIcon";
	import { untrack } from "svelte";

	import { getProfile } from "$lib/api/users/profiles";
	import { getOrCreateConversationsState } from "$lib/chat/conversations-context.svelte";
	import BrokenUserAvatar from "$lib/components/profile/BrokenUserAvatar.svelte";
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import ProgressiveBlur from "$lib/components/shared/ProgressiveBlur.svelte";
	import { Badge } from "$lib/components/ui/badge";
	import { tabsListVariants } from "$lib/components/ui/tabs";
	import { t } from "$lib/i18n";
	import { getTapsState } from "$lib/interest/taps-state.svelte";
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
	contentClass="flex gap-2 overflow-auto no-scrollbar px-1 *:first:ms-auto *:last:me-auto"
	contentScrollIntent="x"
	{@attach bottomChrome}
>
	<div
		class={[
			tabsListVariants({ variant: "default" }),
			"app-nav-island links shrink-0 [&>a>svg]:size-5!",
		]}
	>
		<a
			href="/"
			aria-current={page.route.id === "/(protected)/(navbar)/(root)"
				? "page"
				: undefined}
			data-active={page.route.id === "/(protected)/(navbar)/(root)"}
			onclick={tabNavigation({ href: "/" })}
		>
			<DotsNineIcon weight="fill" />
			{t("nav.browse")}
		</a>
		<a
			href="/carrousel"
			aria-current={page.route.id === "/(protected)/(navbar)/carrousel"
				? "page"
				: undefined}
			data-active={page.route.id === "/(protected)/(navbar)/carrousel"}
			onclick={tabNavigation({ href: "/carrousel" })}
		>
			<DiceFiveIcon weight="fill" />
			{t("nav.carrousel")}
		</a>
		<a
			href="/interest"
			aria-current={page.route.id?.startsWith(
				"/(protected)/(navbar)/interest",
			)
				? "page"
				: undefined}
			data-active={page.route.id?.startsWith(
				"/(protected)/(navbar)/interest",
			)}
			onclick={tabNavigation({
				href: "/interest",
				landsOn: "/interest/taps",
			})}
		>
			<FireIcon weight="fill" />
			{t("nav.interest")}
			{#if hasUnseenTaps}
				<Badge
					class="app-nav-badge-live absolute inset-e-2 top-1 size-2.5 rounded-full p-0"
				/>
			{/if}
		</a>
		<a
			href="/chat"
			aria-current={page.route.id === "/(protected)/chat"
				? "page"
				: undefined}
			data-active={page.route.id === "/(protected)/chat"}
			onclick={tabNavigation({ href: "/chat" })}
		>
			<ChatCircleIcon weight="fill" />
			{t("nav.inbox")}
			{#if hasUnread}
				<Badge
					class="app-nav-badge-live absolute inset-e-2 top-1 size-2.5 rounded-full p-0"
				/>
			{/if}
		</a>
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
		@apply relative inline-flex h-[calc(100%-1px)] min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-full border border-transparent! px-3 py-1.5 text-overline uppercase whitespace-nowrap text-foreground/55 transition-colors duration-200 ease-out group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-1.5 hover:bg-input/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:bg-input/20 data-active:bg-(--accent-soft) data-active:font-semibold data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5;
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
