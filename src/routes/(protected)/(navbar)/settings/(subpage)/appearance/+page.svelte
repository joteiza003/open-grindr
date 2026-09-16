<script lang="ts">
	import AccentSetting from "./AccentSetting.svelte";
	import DensitySetting from "./DensitySetting.svelte";
	import MotionSetting from "./MotionSetting.svelte";
</script>

<h2>Appearance</h2>
<AccentSetting />
<DensitySetting />
<MotionSetting />

<style lang="postcss">
	@reference "$layout";

	h2 {
		@apply mt-2 truncate ps-4 text-xl font-semibold tracking-tight;
	}
</style>
