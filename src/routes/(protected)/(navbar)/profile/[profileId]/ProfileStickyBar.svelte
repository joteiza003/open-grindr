<script lang="ts">
	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import OnlineStatus from "./OnlineStatus.svelte";
	import type { ProfileState } from "./profile-state.svelte";
	import FavoriteProfileToggle from "./top-nav/FavoriteProfileToggle.svelte";
	import ProfileActionsMenu from "./top-nav/ProfileActionsMenu.svelte";

	let {
		profileState,
		visible,
	}: { profileState: ProfileState; visible: boolean } = $props();

	const profile = $derived(profileState.profile);
	const ourProfile = $derived(profileState.isOurProfile);
</script>

<!-- Cabecera compacta: aparece cuando la foto grande ya salió de pantalla. -->
{#if profile}
	<div
		data-slot="profile-sticky-bar"
		aria-hidden={visible ? undefined : "true"}
		inert={!visible}
		class={[
			"absolute inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-border/60 bg-background/95 ps-16 pe-3 pt-[calc(0.5rem+var(--safe-area-top))] pb-2 shadow-sm transition-[transform,opacity] duration-300 ease-(--ease-out-expo)",
			{
				"translate-y-0 opacity-100": visible,
				"pointer-events-none -translate-y-full opacity-0": !visible,
			},
		]}
	>
		<UserAvatar
			mediaHash={profile.medias[0]?.mediaHash ?? null}
			class="size-10 shrink-0 overflow-hidden rounded-full"
			size="md"
		/>
		<div class="min-w-0 flex-1">
			<p class="truncate font-semibold">
				{profile.displayName ?? "Someone"}
				{#if profile.age !== null}
					<span class="font-normal text-muted-foreground">
						, {profile.age}
					</span>
				{/if}
			</p>
			<p class="truncate text-xs text-muted-foreground">
				<OnlineStatus
					onlineUntil={profile.onlineUntil ?? null}
					seen={profile.seen}
					self={ourProfile}
				/>
			</p>
		</div>
		{#if !ourProfile}
			<FavoriteProfileToggle
				compact
				profileId={profile.profileId}
				isFavorite={profile.isFavorite}
				onFavorite={(isFavorite) =>
					profileState.setFavorite(isFavorite)}
			/>
			<ProfileActionsMenu
				compact
				profileId={profile.profileId}
				blockable={profile.isBlockable !== false}
				onBlocked={() => profileState.markBlocked()}
				onHidden={() => profileState.markHidden()}
			/>
		{/if}
	</div>
{/if}
