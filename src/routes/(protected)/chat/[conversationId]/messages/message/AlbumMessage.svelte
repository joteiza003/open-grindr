<script lang="ts">
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import { albumShares } from "$lib/chat/album-shares.svelte";
	import { saveAlbumToLibrary } from "$lib/chat/archive-album";
	import AlbumPreview from "$lib/components/album/AlbumPreview.svelte";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import type { AlbumSlide } from "$lib/components/album/album-lightbox";
	import type { AlbumMessage } from "$lib/model/messaging/messages";
	import { getConversationState } from "../../conversation-state.svelte";
	import AlbumExpiryNote from "./AlbumExpiryNote.svelte";
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
	let downloading = $state(false);

	// Se puede bajar un álbum que nos comparten y que podemos ver. Los de una sola
	// vista no: abrirlos para guardarlos gastaría la única vista.
	const canDownload = $derived(
		isViewable &&
			message.ownerProfileId !== conversationState.ourProfileId &&
			message.expirationType !== "ONCE",
	);

	async function download() {
		downloading = true;
		try {
			await saveAlbum();
		} finally {
			downloading = false;
		}
	}

	async function saveAlbum(slides?: AlbumSlide[]) {
		if (savingAlbum) return;
		savingAlbum = true;
		const profile = conversationState.profile;
		try {
			// Con el visor abierto se reutilizan sus diapositivas para no pedir dos
			// veces un álbum de una sola vista; sin él, se descarga el contenido.
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
<div class="ms-3 flex flex-col items-start">
	<AlbumExpiryNote {message} />
	{#if canDownload}
		<Button
			variant="ghost"
			size="sm"
			class="mt-1 h-6 px-2 text-xs"
			data-slot="album-download"
			disabled={downloading}
			onclick={() => void download()}
		>
			{t("album.saveToLibrary")}
		</Button>
	{/if}
</div>
