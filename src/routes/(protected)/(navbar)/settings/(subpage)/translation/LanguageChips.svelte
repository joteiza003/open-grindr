<script lang="ts">
	import * as Item from "$lib/components/ui/item";
	import { TRANSLATION_LANGUAGES } from "$lib/translate/languages";

	let {
		title,
		value,
		disabled = false,
		onChoose,
	}: {
		title: string;
		value: string;
		disabled?: boolean;
		onChoose: (code: string) => void;
	} = $props();
</script>

<Item.Root variant="outline" class="gap-3 p-4">
	<Item.Content class="gap-1">
		<Item.Title>{title}</Item.Title>
	</Item.Content>
	<div
		class="flex w-full flex-wrap gap-2"
		role="radiogroup"
		aria-label={title}
	>
		{#each TRANSLATION_LANGUAGES as language (language.code)}
			<button
				type="button"
				role="radio"
				aria-checked={value === language.code}
				{disabled}
				class="rounded-full border border-border px-3 py-1.5 text-sm aria-checked:border-foreground aria-checked:bg-muted"
				onclick={() => onChoose(language.code)}
			>
				{language.name}
			</button>
		{/each}
	</div>
</Item.Root>
