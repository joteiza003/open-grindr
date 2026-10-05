<script lang="ts">
	import { Slider } from "$lib/components/ui/slider";
	import { AGE_MAX, AGE_MIN } from "$lib/model/browse/grid/filters";
	import RangeBoundInputs from "../RangeBoundInputs.svelte";
	import { AGE_SLIDER_SCALE } from "../slider-scale";

	let { value = $bindable() }: { value: number[] } = $props();
</script>

<div class="space-y-3">
	<RangeBoundInputs
		bind:value
		floor={AGE_MIN}
		ceiling={AGE_MAX}
		minLabel="Minimum age"
		maxLabel="Maximum age"
	/>
	<Slider
		type="multiple"
		bind:value
		scale={AGE_SLIDER_SCALE}
		thumbLabels={["Minimum age", "Maximum age"]}
	/>
</div>
