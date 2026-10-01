<script lang="ts">
	import { ArrowClockwiseIcon } from "phosphor-svelte";

	import {
		BlockedProfileError,
		HiddenProfileError,
		isUnviewableProfileError,
		ProfileUnavailableError,
	} from "$lib/api/users/profiles";
	import { recordProfileView } from "$lib/app-data/profile-metadata.svelte";
	import ApiErrorDisplay from "$lib/components/feedback/ApiErrorDisplay.svelte";
	import DataRefreshControl from "$lib/components/feedback/DataRefreshControl.svelte";
	import NotFound from "$lib/components/feedback/NotFound.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import type { RenderedGridProfile } from "$lib/grid/grid";
	import BlockedProfile from "../BlockedProfile.svelte";
	import ProfileBottomNavBar from "../bottom-nav/ProfileBottomNavBar.svelte";
	import HiddenProfile from "../HiddenProfile.svelte";
	import ImageCarousel from "../ImageCarousel.svelte";
	import type { ProfileState } from "../profile-state.svelte";
	import ProfileBody from "../ProfileBody.svelte";
	import ProfileHero from "../ProfileHero.svelte";
	import ProfilePreview from "../ProfilePreview.svelte";
	import ProfileSkeleton from "../ProfileSkeleton.svelte";
	import ProfileStickyBar from "../ProfileStickyBar.svelte";

	let {
		profileState,
		position,
		active,
		row,
		heroHash,
	}: {
		profileState: ProfileState;
		position: number;
		active: boolean;
		row: RenderedGridProfile | null;
		heroHash: string | null;
	} = $props();

	let scroller = $state<HTMLElement | null>(null);
	let heroHeight = $state(0);
	let pinned = $state(false);
	let everPinned = $state(false);
	let scrollFrame = 0;

	// Parallax y cabecera fija: una sola lectura de scroll por fotograma.
	function onScroll() {
		if (scrollFrame || !scroller) return;
		scrollFrame = requestAnimationFrame(() => {
			scrollFrame = 0;
			if (!scroller) return;
			const top = scroller.scrollTop;
			scroller.style.setProperty("--og-scroll", String(top));
			pinned = top > Math.max(160, heroHeight * 0.7);
			if (pinned) everPinned = true;
		});
	}

	// Cuenta una visita local cada vez que este perfil pasa a primer plano.
	let counted = false;
	$effect(() => {
		if (!active) {
			counted = false;
			return;
		}
		if (counted || !profile || ourProfile) return;
		counted = true;
		void recordProfileView(profileState.profileId);
	});

	const profile = $derived(profileState.profile);
	const error = $derived(profileState.error);
	const ourProfile = $derived(profileState.isOurProfile);
	const scrollerHooks = $derived(
		active ? { "data-slot": "profile-scroller" } : { tabindex: -1 },
	);
	const showsErrorScreen = $derived(
		error !== null && (row === null || isUnviewableProfileError(error)),
	);
	const medias = $derived(
		profile?.medias ??
			(heroHash === null
				? []
				: [
						{
							mediaHash: heroHash,
							takenOnGrindr: null,
							createdAt: null,
						},
					]),
	);
</script>

<section
	data-slot="profile-pane"
	aria-hidden={active ? undefined : "true"}
	class="absolute inset-y-0 w-full bg-background contain-strict"
	style:left="{position * 100}%"
>
	{#if showsErrorScreen}
		<main
			inert={!active}
			class="flex size-full overflow-y-auto pb-(--nav-height)"
		>
			{#if error instanceof BlockedProfileError}
				<BlockedProfile
					profileId={profileState.profileId}
					blockedByUs={error.blockedByUs}
					onRefresh={() => profileState.markViewable()}
				/>
			{:else if error instanceof HiddenProfileError}
				<HiddenProfile
					profileId={profileState.profileId}
					onRefresh={() => profileState.markViewable()}
				/>
			{:else if error instanceof ProfileUnavailableError}
				<NotFound />
			{:else}
				<ApiErrorDisplay
					{error}
					onRetry={() => profileState.retry()}
					class="m-auto"
				/>
			{/if}
		</main>
	{:else}
		<div
			bind:this={scroller}
			{...scrollerHooks}
			class="h-full overflow-x-hidden overflow-y-auto overscroll-contain overscroll-x-auto pb-[calc(var(--nav-height)+var(--safe-area-bottom)+6.5rem)]"
			onscroll={onScroll}
		>
			<main
				inert={!active}
				class="relative mx-auto min-h-overscrollable w-full max-w-(--profile-content-max)"
			>
				{#if profile || medias.length > 0}
					<div
						class="relative"
						data-slot="profile-hero"
						bind:clientHeight={heroHeight}
					>
						<div data-slot="profile-hero-photo">
							<ImageCarousel {medias} />
						</div>
						<ProfileHero {profileState} />
					</div>
				{:else}
					<Skeleton
						class="aspect-3/4 h-auto max-h-photo w-full rounded-none"
					/>
				{/if}
				{#if profile}
					<ProfileBody {profileState} />
				{:else if row}
					<ProfilePreview {row} {ourProfile} />
					{#if error}
						<div class="flex justify-center">
							<Button
								variant="secondary"
								size="icon-lg"
								aria-label="Retry"
								onclick={() => profileState.retry()}
							>
								<ArrowClockwiseIcon weight="bold" />
							</Button>
						</div>
					{/if}
				{:else}
					<ProfileSkeleton {ourProfile} />
				{/if}
			</main>
		</div>
		{#if profile}
			{#if everPinned}
				<ProfileStickyBar {profileState} visible={pinned && active} />
			{/if}
			<ProfileBottomNavBar
				ourProfileId={profileState.ourProfileId}
				profileId={profile.profileId}
				tapType={profile.tapType}
				{active}
				onTap={(tapType) => profileState.setTap(tapType)}
			/>
		{/if}
		{#if active}
			<DataRefreshControl
				container={scroller}
				updating={profileState.refreshing}
				position="top"
				onrefresh={() => profileState.refresh()}
			/>
		{/if}
	{/if}
</section>
