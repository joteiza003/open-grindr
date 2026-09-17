<script lang="ts">
	import { t } from "$lib/i18n";
	import AccentSetting from "./AccentSetting.svelte";
	import BrowseCardSetting from "./BrowseCardSetting.svelte";
	import BrowseInfoSetting from "./BrowseInfoSetting.svelte";
	import BrowseViewSetting from "./BrowseViewSetting.svelte";
	import BubbleColorsSetting from "./BubbleColorsSetting.svelte";
	import ChatBackgroundSetting from "./ChatBackgroundSetting.svelte";
	import ChatPreview from "./ChatPreview.svelte";
	import ChatStyleSetting from "./ChatStyleSetting.svelte";
	import DensitySetting from "./DensitySetting.svelte";
	import GridPreview from "./GridPreview.svelte";
	import LanguageSetting from "./LanguageSetting.svelte";
	import MotionSetting from "./MotionSetting.svelte";
	import ThemeSetting from "./ThemeSetting.svelte";
</script>

<h2>{t("appearance.title")}</h2>
<LanguageSetting />
<ThemeSetting />
<AccentSetting />
<DensitySetting />
<MotionSetting />

<h2>{t("appearance.browseGrid")}</h2>
<GridPreview />
<BrowseViewSetting />
<BrowseInfoSetting />
<BrowseCardSetting />

<h2>{t("appearance.chat")}</h2>
<ChatPreview />
<ChatStyleSetting />
<BubbleColorsSetting />
<ChatBackgroundSetting />

<style lang="postcss">
	@reference "$layout";

	h2 {
		@apply mt-2 truncate ps-4 text-xl font-semibold tracking-tight;
	}
</style>
