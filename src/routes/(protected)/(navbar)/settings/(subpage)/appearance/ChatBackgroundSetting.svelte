<script lang="ts">
	import { CheckIcon, ImageIcon, TrashIcon } from "phosphor-svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import {
		clearChatBackgroundPhoto,
		storeChatBackgroundPhoto,
	} from "$lib/appearance/chat-background";
	import { chatBackgroundColors } from "$lib/appearance/chat-colors";
	import { Button } from "$lib/components/ui/button";
	import * as Item from "$lib/components/ui/item";
	import { Slider } from "$lib/components/ui/slider";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

	type Kind = "none" | "color" | "photo";

	const background = $derived(preferencesSnapshot().chat.background);
	let fileInput = $state<HTMLInputElement | null>(null);
	let busy = $state(false);

	function patch(next: Partial<typeof background>): Promise<void> {
		const chat = {
			...preferencesSnapshot().chat,
			background: { ...preferencesSnapshot().chat.background, ...next },
		};
		return setPreferences({ chat }).catch((error) => {
			showErrorToast({ label: "Failed to save preferences", error });
		});
	}

	function setKind(next: string): void {
		void patch({ kind: (next || "none") as Kind });
	}

	async function onPhotoPicked(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = "";
		if (!file) return;
		busy = true;
		try {
			await storeChatBackgroundPhoto(file);
			await patch({ kind: "photo", photoUpdatedAt: Date.now() });
		} catch (error) {
			showErrorToast({ label: "Failed to set background photo", error });
		} finally {
			busy = false;
		}
	}

	async function removePhoto(): Promise<void> {
		busy = true;
		try {
			await clearChatBackgroundPhoto();
			await patch({ kind: "none", photoUpdatedAt: Date.now() });
			toast.success("Background photo removed");
		} catch (error) {
			showErrorToast({ label: "Failed to remove photo", error });
		} finally {
			busy = false;
		}
	}
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>Chat background</Item.Title>
		<Item.Description>
			Set a solid color or a photo behind your conversations.
		</Item.Description>
	</Item.Content>

	<ToggleGroup.Root
		type="single"
		variant="outline"
		class="w-full"
		disabled={!preferencesLoaded()}
		bind:value={() => background.kind, setKind}
	>
		<ToggleGroup.Item value="none" class="flex-1 justify-center">
			None
		</ToggleGroup.Item>
		<ToggleGroup.Item value="color" class="flex-1 justify-center">
			Color
		</ToggleGroup.Item>
		<ToggleGroup.Item value="photo" class="flex-1 justify-center">
			Photo
		</ToggleGroup.Item>
	</ToggleGroup.Root>

	{#if background.kind === "color"}
		<div
			class="flex w-full flex-wrap gap-3"
			role="radiogroup"
			aria-label="Background color"
		>
			{#each chatBackgroundColors as color (color)}
				<button
					type="button"
					role="radio"
					aria-checked={background.color === color}
					aria-label="Background color"
					disabled={!preferencesLoaded()}
					class="grid size-9 place-items-center rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-card transition-transform disabled:opacity-50 aria-checked:ring-foreground can-hover:hover:scale-105"
					style:background-color={color}
					onclick={() => void patch({ color })}
				>
					{#if background.color === color}
						<CheckIcon class="size-4 text-white" weight="bold" />
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	{#if background.kind === "photo"}
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			class="hidden"
			onchange={onPhotoPicked}
		/>
		<div class="flex w-full gap-2">
			<Button
				type="button"
				variant="secondary"
				class="flex-1"
				disabled={busy}
				onclick={() => fileInput?.click()}
			>
				<ImageIcon class="size-4" />
				Choose photo
			</Button>
			<Button
				type="button"
				variant="outline"
				size="icon"
				class="size-9 shrink-0"
				aria-label="Remove photo"
				disabled={busy}
				onclick={() => void removePhoto()}
			>
				<TrashIcon class="size-4" />
			</Button>
		</div>

		<div class="flex w-full flex-col gap-1.5">
			<span class="text-sm text-muted-foreground">Blur</span>
			<Slider
				type="single"
				class="w-full"
				min={0}
				max={30}
				step={1}
				disabled={!preferencesLoaded()}
				thumbLabels={["Background blur"]}
				bind:value={
					() => background.blur,
					(blur: number) => void patch({ blur })
				}
			/>
		</div>

		<div class="flex w-full flex-col gap-1.5">
			<span class="text-sm text-muted-foreground">Darkening</span>
			<Slider
				type="single"
				class="w-full"
				min={0}
				max={0.85}
				step={0.05}
				disabled={!preferencesLoaded()}
				thumbLabels={["Background darkening"]}
				bind:value={
					() => background.dim, (dim: number) => void patch({ dim })
				}
			/>
		</div>
	{/if}
</Item.Root>
