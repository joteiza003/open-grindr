<script lang="ts">
	import { untrack } from "svelte";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		deleteFavoriteNote,
		putFavoriteNote,
	} from "$lib/api/users/favorites";
	import { setProfileNoteAndPhone } from "$lib/app-data/profile-metadata.svelte";
	import MultilineField from "$lib/components/fields/MultilineField.svelte";
	import TextField from "$lib/components/fields/TextField.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { t } from "$lib/i18n";
	import {
		isEmptyNote,
		profileNoteLimits,
	} from "$lib/model/users/profile-note";
	import type { FavoriteNote } from "$lib/model/users/favorites";
	import type { Profile } from "$lib/model/users/profiles";

	let {
		profileId,
		isFavorite,
		note,
		onSaved,
		open = $bindable(),
	}: {
		profileId: Profile["profileId"];
		isFavorite: boolean;
		note: FavoriteNote;
		onSaved: (note: FavoriteNote) => void;
		open: boolean;
	} = $props();

	let notes = $state(untrack(() => note.notes));
	let phoneNumber = $state(untrack(() => note.phoneNumber));
	let saving = $state(false);

	$effect(() => {
		if (!open) return;
		untrack(() => {
			notes = note.notes;
			phoneNumber = note.phoneNumber;
		});
	});

	const limits = $derived(profileNoteLimits({ isFavorite }));
	const over = $derived(
		notes.length > limits.notes || phoneNumber.length > limits.phoneNumber,
	);
	const dirty = $derived(
		notes !== note.notes || phoneNumber !== note.phoneNumber,
	);

	async function save() {
		if (saving || !dirty || over) return;
		saving = true;
		const next = {
			notes: notes.trim(),
			phoneNumber: phoneNumber.trim(),
		} satisfies FavoriteNote;
		const emptied = isEmptyNote(next);
		try {
			// Grindr first: if it fails nothing is saved, so both copies agree.
			if (isFavorite) {
				if (emptied) await deleteFavoriteNote({ profileId });
				else await putFavoriteNote({ profileId, note: next });
			}
			await setProfileNoteAndPhone(profileId, {
				note: next.notes,
				phone: next.phoneNumber,
			});
			onSaved(next);
			open = false;
			toast.success(
				emptied ? t("profileNote.deleted") : t("profileNote.saved"),
			);
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("profileNote.saveFailed"), error });
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
			<ResponsiveDialog.Title
				>{t("profileNote.title")}</ResponsiveDialog.Title
			>
			<ResponsiveDialog.Description class="sr-only">
				{t("profileNote.description")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<fieldset disabled={saving} class="contents">
			<ResponsiveDialog.Body
				class="flex flex-col gap-4 pt-1"
				dialogClass="-mx-1 px-1"
			>
				<MultilineField
					bind:value={notes}
					maxLength={limits.notes}
					placeholder={t("profileNote.placeholder")}
				/>
				<TextField
					label={t("profileNote.phone")}
					bind:value={phoneNumber}
					maxLength={limits.phoneNumber}
					type="tel"
					placeholder={t("profileNote.optional")}
				/>
				<p class="text-xs text-muted-foreground">
					{isFavorite
						? t("profileNote.syncedHint")
						: t("profileNote.localHint")}
				</p>
			</ResponsiveDialog.Body>
			<ResponsiveDialog.Footer drawerClass="pt-0">
				<Button disabled={!dirty || over} onclick={() => save()}>
					{t("profileNote.save")}
				</Button>
			</ResponsiveDialog.Footer>
		</fieldset>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
