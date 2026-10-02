<script lang="ts">
	import { UsersThreeIcon } from "phosphor-svelte";

	import { getProfile } from "$lib/api/users/profiles";
	import { Badge } from "$lib/components/ui/badge";
	import { t } from "$lib/i18n";
	import {
		lookingFor as lookingForLabels,
		meetAt as meetAtLabels,
		tribes as tribeLabels,
	} from "$lib/model/users/profiles";
	import {
		commonGround,
		hasCommonGround,
		type ProfileTraits,
	} from "$lib/profile/common-ground";
	import ProfileSection from "./ProfileSection.svelte";

	let {
		ourProfileId,
		theirs,
	}: { ourProfileId: number; theirs: ProfileTraits } = $props();

	let mine = $state<ProfileTraits | null>(null);

	$effect(() => {
		let cancelled = false;
		getProfile(ourProfileId)
			.then((profile) => {
				if (!cancelled) mine = profile;
			})
			.catch((error: unknown) => console.error(error));
		return () => {
			cancelled = true;
		};
	});

	const common = $derived(mine ? commonGround(mine, theirs) : null);

	function labelsOf(ids: number[], options: Record<number, string>) {
		return ids
			.map((id) => options[id])
			.filter((label) => label !== undefined);
	}

	const chips = $derived(
		common === null
			? []
			: [
					...common.tags,
					...labelsOf(common.tribes, tribeLabels),
					...labelsOf(common.lookingFor, lookingForLabels),
					...labelsOf(common.meetAt, meetAtLabels),
				],
	);
</script>

{#if common !== null && hasCommonGround(common) && chips.length > 0}
	<ProfileSection title={t("profile.common.title")}>
		<div
			data-slot="profile-common"
			class="flex flex-wrap items-center gap-1.5"
		>
			<UsersThreeIcon
				class="size-5 shrink-0 text-primary"
				weight="fill"
			/>
			{#each chips as chip (chip)}
				<Badge variant="secondary" class="font-normal">{chip}</Badge>
			{/each}
		</div>
	</ProfileSection>
{/if}
