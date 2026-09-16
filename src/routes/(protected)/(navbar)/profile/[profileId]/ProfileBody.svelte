<script lang="ts">
	import {
		CameraIcon,
		EyesIcon,
		GlobeStandIcon,
		HeartbeatIcon,
		HouseIcon,
		UsersIcon,
		UsersThreeIcon,
	} from "phosphor-svelte";

	import { Skeleton } from "$lib/components/ui/skeleton";
	import {
		acceptNSFWPics,
		ethnicities,
		healthPracticeLabels,
		hivStatuses,
		lookingFor as lookingForLabels,
		meetAt as meetAtLabels,
		relationshipStatuses,
		tribes,
	} from "$lib/model/users/profiles";
	import AboutMe from "./AboutMe.svelte";
	import ProfileBottomNavBar from "./bottom-nav/ProfileBottomNavBar.svelte";
	import Distance from "./Distance.svelte";
	import FavoriteNoteButton from "./favorite-note/FavoriteNoteButton.svelte";
	import Genders from "./fields/GendersPronouns.svelte";
	import HivStatusIcon from "./fields/HivStatusIcon.svelte";
	import LastTested from "./fields/LastTested.svelte";
	import LookupField from "./fields/LookupField.svelte";
	import Socials from "./fields/Socials.svelte";
	import Height from "./HeightWeightBodyType.svelte";
	import ImageCarousel from "./ImageCarousel.svelte";
	import MyProfileTags from "./my-tags/MyProfileTags.svelte";
	import OnlineStatus from "./OnlineStatus.svelte";
	import type { ProfileState } from "./profile-state.svelte";
	import ProfileSection from "./ProfileSection.svelte";
	import ProfileTags from "./ProfileTags.svelte";
	import SexualPosition from "./SexualPosition.svelte";
	import ProfileTopNavBar from "./top-nav/ProfileTopNavBar.svelte";

	let { profileState }: { profileState: ProfileState } = $props();

	const profile = $derived(profileState.profile);
	const ourProfile = $derived(profileState.isOurProfile);
</script>

{#if profileState.loading || !profile}
	<div class="flex max-w-full flex-col">
		<Skeleton class="aspect-3/4 h-auto max-h-photo w-full rounded-none" />

		<div
			class={[
				"flex max-w-full flex-col gap-3.5 p-4",
				{ "pb-24": ourProfile, "pb-40": !ourProfile },
			]}
		>
			<Skeleton class="h-6 w-40 max-w-full" />
			<Skeleton class="h-3 w-30 max-w-full" />
			<Skeleton class="mt-0.5 h-3 w-50 max-w-full" />
			<div class="mt-2 flex flex-wrap gap-1">
				{#each [10, 12, 18, 16, 15] as w, i (i)}
					<Skeleton
						class="h-4.5 w-(--w)"
						--w="calc(var(--spacing) * {w})"
					/>
				{/each}
			</div>
			<Skeleton class="mt-2.25 h-27 w-full rounded-4xl" />
		</div>
	</div>
{:else}
	{@const {
		displayName,
		age,
		onlineUntil,
		seen,
		distance,
		isNew,
		sexualPosition,
		height,
		weight,
		bodyType,
		profileTags,
		aboutMe,
		genders,
		pronouns,
		ethnicity,
		relationshipStatus,
		grindrTribes,
		lookingFor,
		meetAt,
		nsfw,
		hivStatus,
		lastTestedDate: lastTestedDateValue,
		sexualHealth: sexualHealthValue,
		socialNetworks,
		medias,
	} = profile}
	<div class="relative">
		<ImageCarousel {medias} />
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
				<div class="flex flex-wrap items-end gap-x-2 gap-y-1">
					<h1
						class="text-3xl leading-none font-semibold tracking-tight wrap-break-word"
					>
						{#if displayName !== null}
							{displayName}
						{:else}
							<span class="font-normal italic opacity-80"
								>Someone</span
							>
						{/if}
					</h1>
					{#if age !== null}
						<span class="pb-0.5 text-xl font-medium">{age}</span>
					{/if}
				</div>
				<div
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
	</div>
	{#if !ourProfile && profile.isFavorite && profileState.note}
		<FavoriteNoteButton
			profileId={profile.profileId}
			note={profileState.note}
			onSave={(note) => profileState.setNote(note)}
		/>
	{/if}
	<div
		class={[
			"flex flex-col px-4 pt-4",
			{ "pb-24": ourProfile, "pb-40": !ourProfile },
		]}
	>
		{#if sexualPosition !== null || height !== null || weight !== null || bodyType !== null}
			<div class="flex flex-wrap gap-2" data-slot="profile-fact-pills">
				{#if sexualPosition !== null && sexualPosition !== undefined}
					<div
						class="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-xs"
					>
						<SexualPosition {sexualPosition} />
					</div>
				{/if}
				{#if height !== null || weight !== null || bodyType !== null}
					<div
						class="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-xs"
					>
						<Height {height} {weight} {bodyType} />
					</div>
				{/if}
			</div>
		{/if}
		<ProfileTags tags={profileTags} />
		{#if !ourProfile}
			<MyProfileTags profileId={profile.profileId} />
		{/if}
		{#if aboutMe !== null}
			<AboutMe>{aboutMe}</AboutMe>
		{/if}
		{#if (genders && genders.length > 0) || (pronouns && pronouns.length > 0) || ethnicity !== null || relationshipStatus !== null || (grindrTribes && grindrTribes.length > 0)}
			<ProfileSection title="Stats">
				<Genders {genders} {pronouns} />
				<LookupField
					icon={UsersThreeIcon}
					value={grindrTribes}
					options={tribes}
				/>
				<LookupField
					icon={GlobeStandIcon}
					value={ethnicity}
					options={ethnicities}
				/>
				<LookupField
					icon={UsersIcon}
					value={relationshipStatus}
					options={relationshipStatuses}
				/>
			</ProfileSection>
		{/if}
		{#if (lookingFor && lookingFor.length > 0) || (meetAt && meetAt.length > 0) || nsfw !== null}
			<ProfileSection title="Expectations">
				<LookupField
					icon={EyesIcon}
					weight="fill"
					label="Looking For"
					value={lookingFor}
					options={lookingForLabels}
				/>
				<LookupField
					icon={HouseIcon}
					label="Meet At"
					value={meetAt}
					options={meetAtLabels}
				/>
				<LookupField
					icon={CameraIcon}
					label="NSFW Pics?"
					value={nsfw}
					options={acceptNSFWPics}
				/>
			</ProfileSection>
		{/if}
		{#if hivStatus !== null || lastTestedDateValue !== null || (sexualHealthValue && sexualHealthValue.length > 0)}
			<ProfileSection title="Health">
				<LookupField
					icon={HivStatusIcon}
					label="HIV Status"
					value={hivStatus}
					options={hivStatuses}
				/>
				<LastTested lastTestedDate={lastTestedDateValue} />
				<LookupField
					icon={HeartbeatIcon}
					label="Health Practices"
					value={sexualHealthValue}
					options={healthPracticeLabels}
				/>
			</ProfileSection>
		{/if}
		{#if socialNetworks && Object.keys(socialNetworks).length > 0}
			<ProfileSection title="Socials">
				<Socials socials={socialNetworks} />
			</ProfileSection>
		{/if}
	</div>
	<ProfileBottomNavBar
		ourProfileId={profileState.ourProfileId}
		profileId={profile.profileId}
		tapType={profile.tapType}
		onTap={(tapType) => profileState.setTap(tapType)}
	/>
{/if}
