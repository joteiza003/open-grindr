<script lang="ts">
	import { CheckIcon } from "phosphor-svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import {
		type BubbleColorKey,
		bubbleColors,
	} from "$lib/appearance/chat-colors";
	import * as Item from "$lib/components/ui/item";

	type Which = "bubbleOut" | "bubbleIn";

	let pendingOut = $state<BubbleColorKey | null>(null);
	let pendingIn = $state<BubbleColorKey | null>(null);

	const out = $derived(pendingOut ?? preferencesSnapshot().chat.bubbleOut);
	const inbound = $derived(pendingIn ?? preferencesSnapshot().chat.bubbleIn);

	function choose(which: Which, key: BubbleColorKey): void {
		if (which === "bubbleOut") pendingOut = key;
		else pendingIn = key;
		const chat = { ...preferencesSnapshot().chat, [which]: key };
		setPreferences({ chat }).catch((error) => {
			pendingOut = null;
			pendingIn = null;
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}
</script>

{#snippet swatches(which: Which, selected: BubbleColorKey)}
	<div
		class="flex w-full flex-wrap gap-3"
		role="radiogroup"
		aria-label={which === "bubbleOut"
			? "Your bubble color"
			: "Their bubble color"}
	>
		{#each bubbleColors as color (color.key)}
			<button
				type="button"
				role="radio"
				aria-checked={selected === color.key}
				aria-label={color.label}
				title={color.label}
				disabled={!preferencesLoaded()}
				class="grid size-9 place-items-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-transform disabled:opacity-50 aria-checked:ring-foreground can-hover:hover:scale-105"
				style:background-color={color.bg}
				onclick={() => choose(which, color.key)}
			>
				{#if selected === color.key}
					<span
						style:color={color.fg}
						class="grid place-items-center"
					>
						<CheckIcon class="size-4" weight="bold" />
					</span>
				{/if}
			</button>
		{/each}
	</div>
{/snippet}

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Your bubbles</Item.Title>
		<Item.Description>Color of the messages you send.</Item.Description>
	</Item.Content>
	{@render swatches("bubbleOut", out)}
</Item.Root>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Their bubbles</Item.Title>
		<Item.Description>Color of the messages you receive.</Item.Description>
	</Item.Content>
	{@render swatches("bubbleIn", inbound)}
</Item.Root>
