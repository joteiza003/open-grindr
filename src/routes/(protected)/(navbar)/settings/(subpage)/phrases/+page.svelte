<script lang="ts">
	import { PlusIcon } from "phosphor-svelte";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import { phraseProblemMessage } from "$lib/chat/add-phrase-from-message";
	import { FrequentPhrasesState } from "$lib/chat/frequent-phrases-state.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { t } from "$lib/i18n";
	import {
		type FrequentPhrase,
		MAX_PHRASE_LENGTH,
	} from "$lib/model/messaging/frequent-phrases";
	import PhraseEditDialog from "./PhraseEditDialog.svelte";
	import PhraseRow from "./PhraseRow.svelte";

	const list = new FrequentPhrasesState();

	let draft = $state("");
	let addError = $state<string | null>(null);
	let editing = $state<FrequentPhrase | null>(null);
	let editOpen = $state(false);
	let pendingDelete = $state<string[] | null>(null);
	let deleteOpen = $state(false);
	let resetOpen = $state(false);

	onMount(() => {
		void list.load();
	});

	async function add() {
		if (draft.trim() === "") return;
		try {
			const result = await list.add(draft);
			if (result.ok) {
				draft = "";
				addError = null;
			} else {
				addError = phraseProblemMessage(result.problem);
			}
		} catch (error) {
			console.error(error);
			addError = t("phrases.failed");
		}
	}

	function askDelete(ids: string[]) {
		if (ids.length === 0) return;
		pendingDelete = ids;
		deleteOpen = true;
	}

	async function confirmDelete() {
		const ids = pendingDelete ?? [];
		try {
			await list.remove(ids);
			if (list.selecting && list.selected.size === 0) {
				list.stopSelecting();
			}
			toast.success(t("phrases.deleted"));
		} catch (error) {
			console.error(error);
			toast.error(t("phrases.failed"));
		}
		pendingDelete = null;
		deleteOpen = false;
	}

	async function confirmReset() {
		try {
			await list.resetToDefaults();
		} catch (error) {
			console.error(error);
			toast.error(t("phrases.failed"));
		}
		resetOpen = false;
	}

	const deleteTitle = $derived(
		(pendingDelete?.length ?? 0) === 1
			? t("phrases.deleteOne")
			: t("phrases.deleteTitle", { count: pendingDelete?.length ?? 0 }),
	);
</script>

<h1 class="truncate ps-4 text-xl font-semibold tracking-tight">
	{t("phrases.settings")}
</h1>
<p class="px-4 text-sm text-muted-foreground">{t("phrases.intro")}</p>

<form
	class="flex flex-col gap-1"
	onsubmit={(event) => {
		event.preventDefault();
		void add();
	}}
>
	<div class="flex items-center gap-2">
		<Input
			bind:value={draft}
			placeholder={t("phrases.newPlaceholder")}
			aria-label={t("phrases.newPlaceholder")}
			aria-invalid={addError !== null}
			oninput={() => (addError = null)}
			class="flex-1"
		/>
		<Button
			type="submit"
			disabled={draft.trim() === "" || draft.length > MAX_PHRASE_LENGTH}
		>
			<PlusIcon class="size-4" />
			{t("phrases.add")}
		</Button>
	</div>
	{#if addError}
		<p class="px-1 text-sm text-destructive" role="alert">{addError}</p>
	{/if}
</form>

<div class="flex min-h-9 items-center gap-2 px-1">
	<span class="flex-1 text-sm text-muted-foreground">
		{list.selecting
			? t("phrases.selectedCount", { count: list.selected.size })
			: t("phrases.count", { count: list.phrases.length })}
	</span>
	{#if list.selecting}
		<Button variant="ghost" size="sm" onclick={() => list.toggleAll()}>
			{list.allSelected
				? t("phrases.selectNone")
				: t("phrases.selectAll")}
		</Button>
		<Button
			variant="destructive"
			size="sm"
			disabled={list.selected.size === 0}
			onclick={() => askDelete([...list.selected])}
		>
			{t("phrases.deleteSelected")}
		</Button>
		<Button
			variant="secondary"
			size="sm"
			onclick={() => list.stopSelecting()}
		>
			{t("phrases.done")}
		</Button>
	{:else}
		<Button
			variant="secondary"
			size="sm"
			disabled={list.phrases.length === 0}
			onclick={() => list.startSelecting()}
		>
			{t("phrases.select")}
		</Button>
	{/if}
</div>

{#if list.loading}
	<div class="flex flex-col gap-2">
		<Skeleton class="h-11 w-full rounded-xl" />
		<Skeleton class="h-11 w-full rounded-xl" />
		<Skeleton class="h-11 w-full rounded-xl" />
	</div>
{:else if list.phrases.length === 0}
	<p
		class="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
	>
		{t("phrases.none")}
	</p>
{:else}
	<ul
		class="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card"
	>
		{#each list.phrases as phrase, index (phrase.id)}
			<PhraseRow
				{phrase}
				first={index === 0}
				last={index === list.phrases.length - 1}
				selecting={list.selecting}
				selected={list.selected.has(phrase.id)}
				onToggle={() => list.toggle(phrase.id)}
				onEdit={() => {
					editing = phrase;
					editOpen = true;
				}}
				onMove={(delta) => void list.move(phrase.id, delta)}
				onDelete={() => askDelete([phrase.id])}
			/>
		{/each}
	</ul>
{/if}

<Button variant="ghost" class="self-start" onclick={() => (resetOpen = true)}>
	{t("phrases.reset")}
</Button>

<PhraseEditDialog
	text={editing?.text ?? ""}
	bind:open={editOpen}
	onSave={(text) =>
		editing
			? list.edit(editing.id, text)
			: Promise.resolve({ ok: true as const })}
/>

<AlertDialog.Root bind:open={deleteOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{deleteTitle}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("phrases.deleteBody")}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">
				{t("common.cancel")}
			</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => void confirmDelete()}
			>
				{t("common.delete")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={resetOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t("phrases.resetTitle")}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("phrases.resetBody")}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">
				{t("common.cancel")}
			</AlertDialog.Cancel>
			<AlertDialog.Action size="lg" onclick={() => void confirmReset()}>
				{t("phrases.reset")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
