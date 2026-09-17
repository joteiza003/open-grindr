<script lang="ts">
	import { page } from "$app/state";
	import ChatCircleIcon from "phosphor-svelte/lib/ChatCircleIcon";
	import DotsNineIcon from "phosphor-svelte/lib/DotsNineIcon";
	import DropIcon from "phosphor-svelte/lib/DropIcon";
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
</script>

<ProgressiveBlur
	direction="bottomToTop"
	tag="nav"
	class="app-nav fixed bottom-0 z-50 w-full pt-2 pb-fixed-nav"
	bgClass="bg-linear-to-t from-background to-transparent"
	contentClass="overflow-auto no-scrollbar left-1/2 -translate-x-1/2 m-auto flex justify-center gap-2 px-1"
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
			onclick={(e) => {
				if (page.route.id === "/(protected)/(navbar)/(root)") {
					e.preventDefault();
				}
			}}
		>
			<DotsNineIcon weight="fill" />
			{t("nav.browse")}
		</a>
		<a
			href="/right-now"
			aria-current={page.route.id === "/(protected)/(navbar)/right-now"
				? "page"
				: undefined}
			data-active={page.route.id === "/(protected)/(navbar)/right-now"}
		>
			<DropIcon weight="fill" />
			{t("nav.rightNow")}
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
		@apply relative inline-flex h-[calc(100%-1px)] min-w-16 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border border-transparent! px-3 py-1.5 text-xs whitespace-nowrap text-foreground/60 transition-colors duration-200 ease-out group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-1.5 hover:bg-input/20 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 dark:text-muted-foreground dark:hover:bg-input/20 data-active:bg-foreground/7 data-active:font-medium data-active:text-foreground dark:data-active:border-input dark:data-active:text-accent [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5;
	}

	.links a[data-active="true"]::after {
		content: "";
		position: absolute;
		bottom: 0.15rem;
		width: 1.25rem;
		height: 2px;
		border-radius: 999px;
		background: var(--primary);
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
