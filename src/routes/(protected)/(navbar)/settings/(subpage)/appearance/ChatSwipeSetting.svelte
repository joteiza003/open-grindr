<script lang="ts">
	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { SWIPE_ACTIONS, type SwipeAction } from "$lib/chat/swipe-actions";
	import * as Item from "$lib/components/ui/item";
	import { t } from "$lib/i18n";

	const chat = $derived(preferencesSnapshot().chat);

	const sides = [
		{ key: "swipeRight", label: () => t("chat.swipe.right") },
		{ key: "swipeLeft", label: () => t("chat.swipe.left") },
	] as const;

	function choose(key: "swipeRight" | "swipeLeft", action: SwipeAction) {
		if (preferencesSnapshot().chat[key] === action) return;
		setPreferences({
			chat: { ...preferencesSnapshot().chat, [key]: action },
		}).catch((error) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}

	const actionLabel: Record<SwipeAction, () => string> = {
		pin: () => t("chat.swipe.pin"),
		mute: () => t("chat.swipe.mute"),
		delete: () => t("chat.swipe.delete"),
		none: () => t("chat.swipe.none"),
	};
</script>

<Item.Root variant="outline" class="gap-3 p-4" data-slot="chat-swipe-setting">
	<Item.Content class="gap-1">
		<Item.Title>{t("chat.swipe.title")}</Item.Title>
		<Item.Description>{t("chat.swipe.hint")}</Item.Description>
	</Item.Content>
	{#each sides as side (side.key)}
		<div
			class="flex w-full flex-col gap-1.5"
			role="radiogroup"
			aria-label={side.label()}
		>
			<span class="text-xs font-medium text-muted-foreground">
				{side.label()}
			</span>
			<div class="flex flex-wrap gap-1.5">
				{#each SWIPE_ACTIONS as action (action)}
					<button
						type="button"
						role="radio"
						aria-checked={chat[side.key] === action}
						disabled={!preferencesLoaded()}
						class="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors aria-checked:border-transparent aria-checked:bg-primary aria-checked:text-primary-foreground"
						onclick={() => choose(side.key, action)}
					>
						{actionLabel[action]()}
					</button>
				{/each}
			</div>
		</div>
	{/each}
</Item.Root>
