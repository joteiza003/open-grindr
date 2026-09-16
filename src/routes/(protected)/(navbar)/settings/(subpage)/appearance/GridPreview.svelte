<script lang="ts">
	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import ProfileMiniCard from "$lib/components/profile/ProfileMiniCard.svelte";

	const browse = $derived(preferencesSnapshot().browse);
	const cardVariant = $derived(
		browse.viewMode === "grid" ? "standard" : browse.viewMode,
	);
	const cardRadiusVar = $derived(
		browse.cardRadius !== null ? `${browse.cardRadius}px` : undefined,
	);
	const cardGapVar = $derived(
		browse.cardGap !== null ? `${browse.cardGap}px` : undefined,
	);

	const now = Date.now();
	const sample = [
		{
			id: 1,
			displayName: "Alex",
			age: 28,
			distance: 120,
			onlineUntil: now + 3_600_000,
			isFavorite: true,
			isVisiting: false,
		},
		{
			id: 2,
			displayName: "Sam",
			age: 34,
			distance: 540,
			onlineUntil: null,
			isFavorite: false,
			isVisiting: false,
		},
		{
			id: 3,
			displayName: "Jordan",
			age: 25,
			distance: 1200,
			onlineUntil: now + 3_600_000,
			isFavorite: false,
			isVisiting: false,
		},
		{
			id: 4,
			displayName: "Chris",
			age: 41,
			distance: 3200,
			onlineUntil: null,
			isFavorite: false,
			isVisiting: true,
		},
	];
</script>

<div class="mx-auto w-full max-w-xs">
	<div
		class={["photo-grid", `photo-grid-${cardVariant}`]}
		style:--radius-grid={cardRadiusVar}
		style:gap={cardGapVar}
		aria-hidden="true"
	>
		{#each sample as person (person.id)}
			<ProfileMiniCard
				displayName={person.displayName}
				age={person.age}
				distance={person.distance}
				onlineUntil={person.onlineUntil}
				isFavorite={person.isFavorite}
				isVisiting={person.isVisiting}
				variant={cardVariant}
				showName={browse.showName}
				showDistance={browse.showDistance}
				showAge={browse.showAge}
				showOnlineStatus={browse.showOnlineStatus}
				nameStyle={browse.nameStyle}
			/>
		{/each}
	</div>
</div>
