<script lang="ts">
	import ChatCircleIcon from "phosphor-svelte/lib/ChatCircleIcon";

	import { showErrorToast } from "$lib/api/error-toast";
	import { loadFrequentPhrases } from "$lib/chat/frequent-phrases-library";
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import {
		DEFAULT_FREQUENT_PHRASES,
		type FrequentPhrase,
	} from "$lib/model/messaging/frequent-phrases";
	import { draftFromMessage } from "$lib/model/messaging/messages";
	import { getMessageComposerContext } from "../message-composer-context.svelte";

	let {
		disabled = false,
		open = $bindable(false),
	}: { disabled?: boolean; open?: boolean } = $props();

	const composer = getMessageComposerContext();
	let phrases = $state<FrequentPhrase[]>(DEFAULT_FREQUENT_PHRASES);

	$effect(() => {
		if (!open) return;
		void loadFrequentPhrases()
			.then((loaded) => {
				phrases = loaded;
			})
			.catch((error: unknown) => {
				console.error(error);
			});
	});

	async function sendPhrase(phrase: FrequentPhrase) {
		open = false;
		try {
			await composer().sendMessages([
				draftFromMessage({ type: "Text", body: { text: phrase.text } }),
			]);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: "Failed to send message", error });
		}
	}
</script>

<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger>
		{#snippet child({ props: { class: className, ...props } })}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class={[className, "size-9 shrink-0 rounded-full"]}
				aria-label="Frases frecuentes"
				title="Frases frecuentes"
				{disabled}
				{...props}
			>
				<ChatCircleIcon
					weight="fill"
					class="size-4.5"
					color="var(--muted-foreground)"
				/>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="max-h-80 w-64 overflow-auto" align="start">
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading
				>Frases frecuentes</DropdownMenu.GroupHeading
			>
			{#each phrases as phrase (phrase.id)}
				<DropdownMenu.Item onSelect={() => void sendPhrase(phrase)}>
					{phrase.text}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
