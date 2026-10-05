<script lang="ts">
	import type { ComponentProps } from "svelte";

	import type { GridSearchFilters } from "$lib/model/browse/grid/filters";
	import AgeFilter from "./age/AgeFilterField.svelte";
	import FilterBoolean from "./FilterBoolean.svelte";
	import GendersFilter from "./GendersFilter.svelte";
	import HeightFilter from "./HeightFilter.svelte";
	import { optionFilters } from "./option-filters";
	import OptionFilter from "./OptionFilter.svelte";
	import PhotosFilter from "./PhotosFilter.svelte";
	import PositionFilter from "./position/PositionFilterField.svelte";
	import TagsFilter from "./TagsFilter.svelte";
	import WeightFilter from "./WeightFilter.svelte";

	/**
	 * Every filter of the browse screen, edited in place. Renders its three
	 * groups side by side or one after the other, depending on what contains
	 * it: they are plain children of whatever lays them out.
	 */
	let {
		filters = $bindable(),
		photoKinds,
	}: {
		filters: GridSearchFilters;
		/** Which photo filters to offer; all of them unless told otherwise. */
		photoKinds?: ComponentProps<typeof PhotosFilter>["kinds"];
	} = $props();
</script>

<div class="flex max-w-full">
	<FilterBoolean id="favorite" bind:checked={filters.isFavorite}>
		Favorites
	</FilterBoolean>
	<FilterBoolean id="online" bind:checked={filters.isOnline}>
		Online
	</FilterBoolean>
	<FilterBoolean id="right-now" bind:checked={filters.isRightNow}>
		Right now
	</FilterBoolean>
	<AgeFilter bind:checked={filters.ageEnabled} bind:value={filters.age} />
	<GendersFilter
		bind:checked={filters.genderEnabled}
		bind:value={filters.genders}
	/>
</div>
<div class="flex max-w-full">
	<PositionFilter
		bind:checked={filters.positionEnabled}
		bind:value={filters.positions}
	/>
	<PhotosFilter
		bind:checked={filters.photosEnabled}
		bind:value={filters.photos}
		kinds={photoKinds}
	/>
	<TagsFilter bind:checked={filters.tagsEnabled} bind:value={filters.tags} />
</div>
<div class="flex max-w-full">
	<OptionFilter
		filter={optionFilters.tribes}
		bind:checked={filters.tribesEnabled}
		bind:value={filters.tribes}
	/>
	<OptionFilter
		filter={optionFilters.bodyTypes}
		bind:checked={filters.bodyTypesEnabled}
		bind:value={filters.bodyTypes}
	/>
	<HeightFilter
		bind:checked={filters.heightEnabled}
		bind:value={filters.height}
	/>
	<WeightFilter
		bind:checked={filters.weightEnabled}
		bind:value={filters.weight}
	/>
	<OptionFilter
		filter={optionFilters.relationshipStatuses}
		bind:checked={filters.relationshipStatusesEnabled}
		bind:value={filters.relationshipStatuses}
	/>
	<OptionFilter
		filter={optionFilters.acceptNSFWPics}
		bind:checked={filters.acceptNSFWPicsEnabled}
		bind:value={filters.acceptNSFWPics}
	/>
	<OptionFilter
		filter={optionFilters.lookingFor}
		bind:checked={filters.lookingForEnabled}
		bind:value={filters.lookingFor}
	/>
	<OptionFilter
		filter={optionFilters.meetAt}
		bind:checked={filters.meetAtEnabled}
		bind:value={filters.meetAt}
	/>
	<FilterBoolean
		id="havent-chatted-today"
		bind:checked={filters.haventChattedTodayEnabled}
	>
		Haven't chatted today
	</FilterBoolean>
	<OptionFilter
		filter={optionFilters.healthPractices}
		bind:checked={filters.healthPracticesEnabled}
		bind:value={filters.healthPractices}
	/>
</div>
