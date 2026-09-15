<script lang="ts">
	import CommandCenterTrigger from "$lib/components/command-center/CommandCenterTrigger.svelte";
	import ProgressiveBlur from "$lib/components/shared/ProgressiveBlur.svelte";
	import GridFilters from "../GridFilters.svelte";
	import LocationChange from "../LocationChange.svelte";
	import QuickFilters from "./QuickFilters.svelte";
	import BrowseViewModeToggle from "./BrowseViewModeToggle.svelte";

	let openFilters = $state({ all: false, age: false, position: false });
</script>

<ProgressiveBlur
	data-fixed-header
	class="fixed top-0 left-0 z-10 w-full"
	bgClass="bg-linear-to-b from-background to-transparent"
	contentClass="flex flex-col pt-fixed-header"
	direction="topToBottom"
>
	<div class="scrollbar-thin flex items-center gap-1 overflow-x-auto px-4 pt-0 pb-2">
		<LocationChange />
		<QuickFilters bind:openFilters />
		<CommandCenterTrigger />
		<BrowseViewModeToggle />
	</div>
</ProgressiveBlur>
<GridFilters bind:open={openFilters.all} />
