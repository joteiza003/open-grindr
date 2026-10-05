<script lang="ts">
	import { ChatIcon, StarIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import ProfileStatusIndicator from "$lib/components/profile/ProfileStatusIndicator.svelte";
	import * as Item from "$lib/components/ui/item";
	import SwitchField from "$lib/components/ui/switch-field/SwitchField.svelte";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import { t } from "$lib/i18n";

	type NameStyle = "solid" | "gradient" | "none";

	const browse = $derived(preferencesSnapshot().browse);

	function patch(next: Partial<typeof browse>): void {
		const updated = { ...preferencesSnapshot().browse, ...next };
		setPreferences({ browse: updated }).catch((error) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

<SwitchField
	title="Show name"
	description="Display each person's name on their card."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showName, (showName: boolean) => patch({ showName })
	}
/>
<SwitchField
	title="Show distance"
	description="Display how far away each person is."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showDistance,
		(showDistance: boolean) => patch({ showDistance })
	}
/>
<SwitchField
	title="Show age"
	description="Display each person's age next to their name."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showAge, (showAge: boolean) => patch({ showAge })
	}
/>
<SwitchField
	title="Show online status"
	description="Display the online indicator on each card."
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showOnlineStatus,
		(showOnlineStatus: boolean) => patch({ showOnlineStatus })
	}
/>
<SwitchField
	title={t("favoritesStrip.setting")}
	description={t("favoritesStrip.settingHint")}
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showFavoritesStrip,
		(showFavoritesStrip: boolean) => patch({ showFavoritesStrip })
	}
/>
<SwitchField
	title={t("indicators.favorite")}
	description={t("indicators.favoriteHint")}
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showFavoriteBadge,
		(showFavoriteBadge: boolean) => patch({ showFavoriteBadge })
	}
/>
<SwitchField
	title={t("indicators.chat")}
	description={t("indicators.chatHint")}
	disabled={!preferencesLoaded()}
	bind:checked={
		() => browse.showChatBadge,
		(showChatBadge: boolean) => patch({ showChatBadge })
	}
/>

<Item.Root variant="outline" class="gap-3 p-4" data-slot="indicator-legend">
	<Item.Content class="gap-2">
		<Item.Title>{t("indicators.legend")}</Item.Title>
		<ul class="flex flex-col gap-2 text-sm">
			<li class="flex items-center gap-2">
				<ProfileStatusIndicator
					onlineUntil={Date.now() + 600_000}
					isVisiting={false}
				/>
				{t("indicators.legendOnline")}
			</li>
			<li class="flex items-center gap-2">
				<ProfileStatusIndicator onlineUntil={null} isVisiting={true} />
				{t("indicators.legendVisiting")}
			</li>
			<li class="flex items-center gap-2">
				<StarIcon weight="fill" class="size-4 text-yellow-500" />
				{t("indicators.legendFavorite")}
			</li>
			<li class="flex items-center gap-2">
				<ChatIcon weight="fill" class="size-4 text-sky-400" />
				{t("indicators.legendChat")}
			</li>
		</ul>
	</Item.Content>
</Item.Root>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Name style</Item.Title>
		<Item.Description>How the name sits over the photo.</Item.Description>
	</Item.Content>
	<ToggleGroup.Root
		type="single"
		variant="outline"
		class="w-full"
		disabled={!preferencesLoaded() || !browse.showName}
		bind:value={
			() => browse.nameStyle,
			(next: string) =>
				patch({ nameStyle: (next || "solid") as NameStyle })
		}
	>
		<ToggleGroup.Item value="solid" class="flex-1 justify-center">
			Chip
		</ToggleGroup.Item>
		<ToggleGroup.Item value="gradient" class="flex-1 justify-center">
			Gradient
		</ToggleGroup.Item>
		<ToggleGroup.Item value="none" class="flex-1 justify-center">
			Minimal
		</ToggleGroup.Item>
	</ToggleGroup.Root>
</Item.Root>
