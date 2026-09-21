<script lang="ts">
	import * as Tabs from "$lib/components/ui/tabs";
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

	let section = $state<"general" | "browse" | "chat">("general");
</script>

<h1 class="truncate ps-4 text-xl font-semibold tracking-tight">
	{t("appearance.title")}
</h1>

<Tabs.Root bind:value={section} class="gap-3">
	<Tabs.List class="w-full">
		<Tabs.Trigger value="general">{t("appearance.general")}</Tabs.Trigger>
		<Tabs.Trigger value="browse">{t("appearance.browseGrid")}</Tabs.Trigger>
		<Tabs.Trigger value="chat">{t("appearance.chat")}</Tabs.Trigger>
	</Tabs.List>

	<Tabs.Content value="general" class="flex flex-col gap-3">
		<LanguageSetting />
		<ThemeSetting />
		<AccentSetting />
		<DensitySetting />
		<MotionSetting />
	</Tabs.Content>

	<Tabs.Content value="browse" class="flex flex-col gap-3">
		<GridPreview />
		<BrowseViewSetting />
		<BrowseInfoSetting />
		<BrowseCardSetting />
	</Tabs.Content>

	<Tabs.Content value="chat" class="flex flex-col gap-3">
		<ChatPreview />
		<ChatStyleSetting />
		<BubbleColorsSetting />
		<ChatBackgroundSetting />
	</Tabs.Content>
</Tabs.Root>
