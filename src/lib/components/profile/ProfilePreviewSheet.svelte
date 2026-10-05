<script lang="ts">
	import { goto } from "$app/navigation";

	import { getProfile } from "$lib/api/users/profiles";
	import DisplayName from "$lib/components/profile/DisplayName.svelte";
	import DistanceFormatted from "$lib/components/profile/DistanceFormatted.svelte";
	import { profilePreview } from "$lib/components/profile/profile-preview-state.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import UserSilhouette from "$lib/components/profile/UserSilhouette.svelte";
	import MediaImage from "$lib/components/shared/MediaImage.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { t } from "$lib/i18n";
	import { profileMediaUrl } from "$lib/util/media";
	import type { Profile } from "$lib/model/users/profiles";

	let profile = $state<Profile | null>(null);
	let failed = $state(false);
	let photoIndex = $state(0);
	let generation = 0;

	const profileId = $derived(profilePreview.profileId);
	const hint = $derived(profilePreview.hint);

	// Solo se consideran las fotos ya aprobadas con hash público.
	const hashes = $derived(
		profile
			? profile.medias.map((media) => media.mediaHash)
			: hint.mediaHash
				? [hint.mediaHash]
				: [],
	);
	const mainHash = $derived(hashes[photoIndex] ?? hashes[0] ?? null);
	const displayName = $derived(
		profile?.displayName ?? hint.displayName ?? null,
	);
	const age = $derived(profile?.age ?? hint.age ?? null);
	const distance = $derived(profile?.distance ?? hint.distance ?? null);

	$effect(() => {
		const id = profileId;
		const current = ++generation;
		profile = null;
		failed = false;
		photoIndex = 0;
		if (id === null) return;
		getProfile(id)
			.then((loaded) => {
				if (current === generation) profile = loaded;
			})
			.catch((error: unknown) => {
				console.error(error);
				if (current === generation) failed = true;
			});
	});

	function openProfile() {
		const id = profileId;
		if (id === null) return;
		profilePreview.close();
		void goto(`/profile/${id}`, { state: { profileOrigin: "browse" } });
	}
</script>

<ResponsiveDialog.Root
	bind:open={
		() => profilePreview.open, (value) => !value && profilePreview.close()
	}
>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="max-h-[calc(var(--screen-safe)-4rem)] sm:max-w-sm"
		drawerClass="max-h-screen-safe"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title class="flex items-center gap-2">
				{#if profile}
					<ProfileStatusIndicator
						onlineUntil={profile.onlineUntil ?? null}
						isVisiting={profile.isVisiting}
					/>
				{/if}
				<span class="truncate"><DisplayName name={displayName} /></span>
				{#if typeof age === "number"}
					<span class="font-normal">{age}</span>
				{/if}
			</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				{#if distance !== null}
					<DistanceFormatted {distance} />
				{:else}
					{t("preview.description")}
				{/if}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="profile-preview"
			class="flex flex-col gap-3"
			dialogClass="-mx-1 px-1"
			drawerClass="px-4 pb-4"
		>
			<div
				class="relative aspect-3/4 max-h-[50vh] w-full overflow-hidden rounded-2xl bg-muted"
			>
				{#if mainHash}
					{#key mainHash}
						<MediaImage
							src={profileMediaUrl({
								mediaHash: mainHash,
								size: "full",
							})}
							class="size-full"
							imgClass="object-cover"
							tone="photo"
							size="xl"
							loading="eager"
						/>
					{/key}
				{:else}
					<div class="flex size-full items-center justify-center">
						<UserSilhouette
							class="m-auto size-1/2 text-muted-foreground"
						/>
					</div>
				{/if}
			</div>

			{#if hashes.length > 1}
				<div
					class="flex gap-1.5 overflow-x-auto"
					role="tablist"
					aria-label={t("preview.photos")}
				>
					{#each hashes as hash, index (hash)}
						<button
							type="button"
							role="tab"
							aria-selected={index === photoIndex}
							aria-label={t("preview.photoN", { n: index + 1 })}
							class="size-14 shrink-0 overflow-hidden rounded-lg border-2 border-transparent aria-selected:border-primary"
							onclick={() => (photoIndex = index)}
						>
							<MediaImage
								src={profileMediaUrl({
									mediaHash: hash,
									size: "thumb",
								})}
								class="size-full"
								imgClass="object-cover"
								tone="photo"
								loading="lazy"
							/>
						</button>
					{/each}
				</div>
			{/if}

			{#if failed}
				<p class="text-sm text-muted-foreground">
					{t("preview.failed")}
				</p>
			{:else if profile === null}
				<Skeleton class="h-10 w-full" />
			{:else}
				{#if profile.aboutMe}
					<p class="line-clamp-5 text-sm whitespace-pre-line">
						{profile.aboutMe}
					</p>
				{/if}
				{#if profile.profileTags.length > 0}
					<ul class="flex flex-wrap gap-1.5">
						{#each profile.profileTags.slice(0, 8) as tag (tag)}
							<li
								class="rounded-full border border-border px-2.5 py-0.5 text-xs"
							>
								{tag}
							</li>
						{/each}
					</ul>
				{/if}
			{/if}

			<Button class="w-full" onclick={openProfile}>
				{t("preview.open")}
			</Button>
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
