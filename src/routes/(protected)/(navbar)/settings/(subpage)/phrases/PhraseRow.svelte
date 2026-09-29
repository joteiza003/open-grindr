<script lang="ts">
	import {
		ArrowDownIcon,
		ArrowUpIcon,
		PencilSimpleIcon,
		TrashIcon,
	} from "phosphor-svelte";

	import { Button } from "$lib/components/ui/button";
	import { Checkbox } from "$lib/components/ui/checkbox";
	import { t } from "$lib/i18n";
	import type { FrequentPhrase } from "$lib/model/messaging/frequent-phrases";

	let {
		phrase,
		first,
		last,
		selecting,
		selected,
		onToggle,
		onEdit,
		onMove,
		onDelete,
	}: {
		phrase: FrequentPhrase;
		first: boolean;
		last: boolean;
		selecting: boolean;
		selected: boolean;
		onToggle: () => void;
		onEdit: () => void;
		onMove: (delta: number) => void;
		onDelete: () => void;
	} = $props();
</script>

<li
	class={[
		"flex items-center gap-1 px-2 py-1.5",
		{ "bg-primary/10": selected },
	]}
>
	{#if selecting}
		<button
			type="button"
			class="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-2 text-left"
			aria-pressed={selected}
			aria-label={t("phrases.selectAria", { text: phrase.text })}
			onclick={onToggle}
		>
			<Checkbox
				checked={selected}
				tabindex={-1}
				aria-hidden="true"
				class="pointer-events-none"
			/>
			<span class="min-w-0 flex-1 text-sm wrap-break-word">
				{phrase.text}
			</span>
		</button>
	{:else}
		<button
			type="button"
			class="min-w-0 flex-1 rounded-lg px-2 py-2 text-left text-sm wrap-break-word"
			aria-label={t("phrases.editAria", { text: phrase.text })}
			onclick={onEdit}
		>
			{phrase.text}
		</button>
		<div class="flex shrink-0 items-center">
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="size-8"
				disabled={first}
				aria-label={t("phrases.moveUp")}
				title={t("phrases.moveUp")}
				onclick={() => onMove(-1)}
			>
				<ArrowUpIcon class="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="size-8"
				disabled={last}
				aria-label={t("phrases.moveDown")}
				title={t("phrases.moveDown")}
				onclick={() => onMove(1)}
			>
				<ArrowDownIcon class="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="size-8"
				aria-label={t("phrases.edit")}
				title={t("phrases.edit")}
				onclick={onEdit}
			>
				<PencilSimpleIcon class="size-4" />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				class="size-8 text-destructive"
				aria-label={t("common.delete")}
				title={t("common.delete")}
				onclick={onDelete}
			>
				<TrashIcon class="size-4" />
			</Button>
		</div>
	{/if}
</li>
