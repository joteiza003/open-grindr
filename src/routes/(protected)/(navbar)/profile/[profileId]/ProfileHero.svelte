<script lang="ts">
	import Distance from "./Distance.svelte";
	import OnlineStatus from "./OnlineStatus.svelte";
	import type { ProfileState } from "./profile-state.svelte";
	import ProfileTopNavBar from "./top-nav/ProfileTopNavBar.svelte";

	let { profileState }: { profileState: ProfileState } = $props();

	const profile = $derived(profileState.profile);
	const ourProfile = $derived(profileState.isOurProfile);
</script>

<!-- Laid over the photo carousel: the name, status and profile actions. -->
{#if profile}
	{@const { displayName, age, onlineUntil, seen, distance, isNew } = profile}
	<ProfileTopNavBar
		ourProfileId={profileState.ourProfileId}
		{profile}
		onBlocked={() => profileState.markBlocked()}
		onHidden={() => profileState.markHidden()}
		onFavorite={(isFavorite) => profileState.setFavorite(isFavorite)}
	/>
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/35 to-transparent px-4 pt-18 pb-4 text-white"
		data-slot="profile-hero-overlay"
	>
		<div class="max-w-3xl pr-16">
			<h1
				class="flex flex-wrap items-end gap-x-2 gap-y-1 text-3xl leading-none font-semibold tracking-tight wrap-break-word"
			>
				<span>
					{#if displayName !== null}
						{displayName}
					{:else}
						<span class="font-normal italic opacity-80">Someone</span>
					{/if}
				</span>
				{#if age !== null}
					<span class="sr-only">, </span>
					<span class="pb-0.5 text-xl font-medium">{age}</span>
				{/if}
			</h1>
			<div
				data-slot="profile-status-row"
				class="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/85"
			>
				<OnlineStatus
					onlineUntil={onlineUntil ?? null}
					{seen}
					self={ourProfile}
				/>
				{#if distance !== null}
					<span class="opacity-40">·</span>
					<Distance {distance} />
				{/if}
				{#if isNew}
					<span
						class="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"
						>New</span
					>
				{/if}
			</div>
		</div>
	</div>
{/if}
