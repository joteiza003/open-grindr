<script lang="ts">
	import AccentSetting from "./AccentSetting.svelte";
	import BrowseCardSetting from "./BrowseCardSetting.svelte";
	import BrowseInfoSetting from "./BrowseInfoSetting.svelte";
	import BrowseViewSetting from "./BrowseViewSetting.svelte";
	import BubbleColorsSetting from "./BubbleColorsSetting.svelte";
	import ChatBackgroundSetting from "./ChatBackgroundSetting.svelte";
	import ChatPreview from "./ChatPreview.svelte";
	import DensitySetting from "./DensitySetting.svelte";
	import GridPreview from "./GridPreview.svelte";
	import MotionSetting from "./MotionSetting.svelte";
</script>

<h2>Appearance</h2>
<AccentSetting />
<DensitySetting />
<MotionSetting />

<h2>Browse grid</h2>
<GridPreview />
<BrowseViewSetting />
<BrowseInfoSetting />
<BrowseCardSetting />

<h2>Chat</h2>
<ChatPreview />
<BubbleColorsSetting />
<ChatBackgroundSetting />

<style lang="postcss">
	@reference "$layout";

	h2 {
		@apply mt-2 truncate ps-4 text-xl font-semibold tracking-tight;
	}
</style>
