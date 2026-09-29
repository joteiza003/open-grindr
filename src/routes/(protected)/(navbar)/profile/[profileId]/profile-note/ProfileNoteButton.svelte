<script lang="ts">
	import { NotePencilIcon } from "phosphor-svelte";

	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import { isEmptyNote } from "$lib/model/users/profile-note";
	import type { FavoriteNote } from "$lib/model/users/favorites";
	import type { Profile } from "$lib/model/users/profiles";
	import ProfileNoteEditor from "./ProfileNoteEditor.svelte";

	let {
		profileId,
		isFavorite,
		note,
		onSaved,
	}: {
		profileId: Profile["profileId"];
		isFavorite: boolean;
		note: FavoriteNote;
		onSaved: (note: FavoriteNote) => void;
	} = $props();

	let open = $state(false);

	const empty = $derived(isEmptyNote(note));
	const label = $derived(
		note.notes || note.phoneNumber || t("profileNote.add"),
	);
</script>

<Button
	size="sm"
	variant={empty ? "secondary" : "default"}
	class="absolute top-2 right-2 z-10 max-w-1/2"
	onclick={() => (open = true)}
>
	<NotePencilIcon
		weight={empty ? "regular" : "fill"}
		class="size-4 shrink-0"
	/>
	<span class="truncate">{label}</span>
</Button>
<ProfileNoteEditor {profileId} {isFavorite} {note} {onSaved} bind:open />
