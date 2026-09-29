<script lang="ts">
	import { untrack } from "svelte";

	import { phraseProblemMessage } from "$lib/chat/add-phrase-from-message";
	import MultilineField from "$lib/components/fields/MultilineField.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { t } from "$lib/i18n";
	import { MAX_PHRASE_LENGTH } from "$lib/model/messaging/frequent-phrases";
	import type { PhraseResult } from "$lib/chat/frequent-phrases-state.svelte";

	let {
		text,
		onSave,
		open = $bindable(false),
	}: {
		text: string;
		onSave: (text: string) => Promise<PhraseResult>;
		open: boolean;
	} = $props();

	let value = $state(untrack(() => text));
	let error = $state<string | null>(null);
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			value = text;
			error = null;
		});
	});

	const over = $derived(value.length > MAX_PHRASE_LENGTH);
	const dirty = $derived(value.trim() !== text.trim());

	async function save() {
		if (saving || over || !dirty) return;
		saving = true;
		try {
			const result = await onSave(value);
			if (result.ok) open = false;
			else error = phraseProblemMessage(result.problem);
		} catch (err) {
			console.error(err);
			error = t("phrases.failed");
		} finally {
			saving = false;
		}
	}
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content
		class="flex flex-col gap-4"
		drawerClass="**:[fieldset>div]:px-4"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header drawerClass="p-0">
			<ResponsiveDialog.Title>{t("phrases.edit")}</ResponsiveDialog.Title>
			<ResponsiveDialog.Description class="sr-only">
				{t("phrases.intro")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<fieldset disabled={saving} class="contents">
			<ResponsiveDialog.Body
				class="flex flex-col gap-2 pt-1"
				dialogClass="-mx-1 px-1"
			>
				<MultilineField
					bind:value
					maxLength={MAX_PHRASE_LENGTH}
					placeholder={t("phrases.newPlaceholder")}
				/>
				{#if error}
					<p class="px-1 text-sm text-destructive" role="alert">
						{error}
					</p>
				{/if}
			</ResponsiveDialog.Body>
			<ResponsiveDialog.Footer drawerClass="pt-0">
				<Button
					disabled={!dirty || over || value.trim() === ""}
					onclick={() => void save()}
				>
					{t("common.save")}
				</Button>
			</ResponsiveDialog.Footer>
		</fieldset>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
