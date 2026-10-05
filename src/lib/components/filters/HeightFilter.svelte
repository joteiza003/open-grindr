<script lang="ts">
	import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
	import FilterDropdown from "$lib/components/filters/FilterDropdown.svelte";
	import { Slider } from "$lib/components/ui/slider";
	import {
		HEIGHT_CM_MAX,
		HEIGHT_CM_MIN,
		rangeBoundTexts,
	} from "$lib/model/browse/grid/filters";
	import { formatHeight } from "$lib/util/units";
	import RangeBoundInputs from "./RangeBoundInputs.svelte";

	let {
		checked = $bindable(),
		value = $bindable(),
	}: { checked: boolean; value: number[] } = $props();

	const units = $derived(preferencesSnapshot().units);
	const imperial = $derived(units === "imperial");
	const [minText, maxText] = $derived(
		rangeBoundTexts({
			floor: HEIGHT_CM_MIN,
			ceiling: HEIGHT_CM_MAX,
			range: value,
			format: formatHeight,
			units,
		}),
	);
</script>

<div class="block w-full space-y-3">
	<FilterDropdown
		id="height"
		label="Height"
		bind:checked
		endLabel={`${minText} - ${maxText}`}
		contentClass="ps-7"
	>
		<div class="space-y-3 pb-2">
			<RangeBoundInputs
				bind:value={
					() => value,
					(v: number[]) => {
						checked = true;
						value = v;
					}
				}
				floor={HEIGHT_CM_MIN}
				ceiling={HEIGHT_CM_MAX}
				unit={imperial ? "in" : "cm"}
				toDisplay={(cm) => (imperial ? cm / 2.54 : cm)}
				fromDisplay={(typed) => (imperial ? typed * 2.54 : typed)}
				minLabel="Minimum height"
				maxLabel="Maximum height"
			/>
			<div class="h-6">
				<Slider
					type="multiple"
					bind:value={
						() => value,
						(v: number[]) => {
							checked = true;
							value = v;
						}
					}
					min={HEIGHT_CM_MIN}
					max={HEIGHT_CM_MAX}
					step={1}
					thumbValueTexts={[minText, maxText]}
					thumbLabels={["Minimum height", "Maximum height"]}
				/>
			</div>
		</div>
	</FilterDropdown>
</div>
