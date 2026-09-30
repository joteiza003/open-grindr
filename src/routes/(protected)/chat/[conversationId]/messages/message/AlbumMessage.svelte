<script lang="ts">
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import { albumShares } from "$lib/chat/album-shares.svelte";
	import { saveAlbumToLibrary } from "$lib/chat/archive-album";
	import AlbumPreview from "$lib/components/album/AlbumPreview.svelte";
	import { t } from "$lib/i18n";
	import type { AlbumSlide } from "$lib/components/album/album-lightbox";
	import type { AlbumMessage } from "$lib/model/messaging/messages";
	import { getConversationState } from "../../conversation-state.svelte";
	import LockedMedia from "./LockedMedia.svelte";
	import { MessageMediaState } from "./message-media.svelte";

	let { message }: { message: AlbumMessage["body"] } = $props();

	const media = new MessageMediaState();
	const conversationState = $derived(getConversationState()());
	const peerProfileId = $derived(
		conversationState.profile?.profileId ?? null,
	);
	const isViewable = $derived.by(() => {
		if (peerProfileId === null) return message.isViewable;
		return (
			albumShares.isSharedWith({
				albumId: message.albumId,
				profileId: peerProfileId,
			}) ?? message.isViewable
		);
	});

	let savingAlbum = false;

	async function saveAlbum(slides: AlbumSlide[]) {
		if (savingAlbum) return;
		savingAlbum = true;
		const profile = conversationState.profile;
		try {
			// Reuse the slides the viewer already loaded so a single-view album
			// is never fetched twice.
			await saveAlbumToLibrary({
				body: message,
				conversationId: conversationState.conversationId,
				content: slides,
				profileSnapshot: {
					profileId:
						profile?.profileId ?? message.ownerProfileId ?? null,
					displayName: profile?.name ?? null,
					age: null,
					distance: profile?.distance ?? null,
				},
			});
			toast.success(t("album.saved"));
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("album.saveFailed"), error });
		} finally {
			savingAlbum = false;
		}
	}

	const className: import("svelte/elements").ClassValue = $derived([
		"aspect-3/4 h-auto",
		{
			"ring ring-accent": message.hasUnseenContent,
			"w-2/5 min-w-35 max-w-60 ms-3": !media.clone,
			"size-full": media.clone,
		},
	]);

	const contentClass: import("svelte/elements").ClassValue = $derived([
		"rounded-xl",
		media.cornerClass,
	]);
</script>

{#if isViewable}
	<AlbumPreview
		albumId={message.albumId}
		coverUrl={message.coverUrl}
		hasPhoto={message.hasPhoto}
		hasVideo={message.hasVideo}
		label={t("album.open")}
		class={className}
		{contentClass}
		attach={media.attach}
		onSave={(slides) => void saveAlbum(slides)}
	>
		{@render media.adornments?.()}
	</AlbumPreview>
{:else}
	<div
		data-slot="locked-album"
		class={[className, contentClass, "relative"]}
		{@attach media.attach}
	>
		<LockedMedia class={media.cornerClass} />
		{@render media.adornments?.()}
	</div>
{/if}
