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

	import { profileMetadata } from "$lib/app-data/profile-metadata.svelte";
	import { mergeProfileNote } from "$lib/model/users/profile-note";
	import {
		acceptNSFWPics,
		ethnicities,
		healthPracticeLabels,
		hivStatusLabels,
		lookingFor as lookingForLabels,
		meetAt as meetAtLabels,
		relationshipStatuses,
		tribes,
	} from "$lib/model/users/profiles";
	import AboutMe from "./AboutMe.svelte";
	import Genders from "./fields/GendersPronouns.svelte";
	import HivStatusIcon from "./fields/HivStatusIcon.svelte";
	import LastTested from "./fields/LastTested.svelte";
	import LookupField from "./fields/LookupField.svelte";
	import Socials from "./fields/Socials.svelte";
	import Height from "./HeightWeightBodyType.svelte";
	import MyProfileTags from "./my-tags/MyProfileTags.svelte";
	import ProfileNoteButton from "./profile-note/ProfileNoteButton.svelte";
	import type { ProfileState } from "./profile-state.svelte";
	import ProfileSection from "./ProfileSection.svelte";
	import ProfileQuickActions from "./ProfileQuickActions.svelte";
	import ProfileSummary from "./ProfileSummary.svelte";
	import ProfileTags from "./ProfileTags.svelte";
	import TriangulateButton from "./TriangulateButton.svelte";

	let { profileState }: { profileState: ProfileState } = $props();

	const profile = $derived(profileState.profile);
	const ourProfile = $derived(profileState.isOurProfile);
	const localMeta = $derived(profileMetadata(profileState.profileId));
	const unifiedNote = $derived(
		mergeProfileNote({
			local: { note: localMeta.note, phone: localMeta.phone },
			favorite: profileState.note,
		}),
	);
</script>

{#if profile}
	{@const {
		displayName,
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
	} = profile}
	{#if !ourProfile}
		<ProfileNoteButton
			profileId={profile.profileId}
			isFavorite={profile.isFavorite}
			note={unifiedNote}
			onSaved={(note) => {
				if (profile.isFavorite) profileState.setNote(note);
			}}
		/>
		<div class="flex items-center gap-2 px-4 pt-3">
			<TriangulateButton profileId={profile.profileId} {displayName} />
			<span class="text-xs text-muted-foreground">
				Estima la ubicación real midiendo desde 3 posiciones
			</span>
		</div>
	{/if}
	<div
		class={[
			"flex flex-col px-4 pt-4",
			{ "pb-24": ourProfile, "pb-40": !ourProfile },
		]}
	>
		{#if !ourProfile}
			<ProfileQuickActions
				{profileState}
				blockable={profile.isBlockable !== false}
			/>
		{/if}
		<ProfileSummary
			age={profile.age}
			showAge={profile.showAge}
			distance={profile.showDistance ? profile.distance : null}
			{sexualPosition}
			{lookingFor}
		/>
		{#if height !== null || weight !== null || bodyType !== null}
			<div class="flex flex-wrap gap-2" data-slot="profile-fact-pills">
				<div
					class="rounded-full border border-border/70 bg-card px-3 py-1.5 text-sm shadow-xs"
				>
					<Height {height} {weight} {bodyType} />
				</div>
			</div>
		{/if}
		<ProfileTags tags={profileTags} />
		{#if !ourProfile}
			<MyProfileTags profileId={profile.profileId} />
		{/if}
		{#if aboutMe !== null}
			<AboutMe>{aboutMe}</AboutMe>
		{/if}
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
		<ProfileSection title="Health">
			<LookupField
				icon={HivStatusIcon}
				label="HIV Status"
				value={hivStatus}
				options={hivStatusLabels}
			/>
			<LastTested lastTestedDate={lastTestedDateValue} />
			<LookupField
				icon={HeartbeatIcon}
				label="Health Practices"
				value={sexualHealthValue}
				options={healthPracticeLabels}
			/>
		</ProfileSection>
		<ProfileSection title="Socials">
			<Socials socials={socialNetworks} />
		</ProfileSection>
	</div>
{/if}
