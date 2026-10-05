<script lang="ts">
	import { toast } from "svelte-sonner";

	import {
		addMediaToDrawer,
		CHAT_MEDIA_MAX_LABEL,
		UnsupportedChatMediaError,
	} from "$lib/api/messaging/chat-media";
	import {
		deleteDrawerMedia,
		type DrawerMedia,
		getDrawerMedia,
	} from "$lib/api/messaging/drawer";
	import { uploadRefusalMessage } from "$lib/api/methods";
	import { createRealAlbumFromDrawer } from "$lib/albums/promote-to-real";
	import {
		createPhotoAlbum,
		mutateStoredPhotoAlbums,
		upsertPhotoAlbum,
	} from "$lib/chat/photo-albums-library";
	import { Button } from "$lib/components/ui/button";
	import { t } from "$lib/i18n";
	import MediaSheetGrid from "$lib/components/media-sheet/MediaSheetGrid.svelte";
	import { mediaFileKindOf } from "$lib/platform/media-file";
	import { pickMultipleMedia } from "$lib/platform/media-picker";
	import { proxyMediaUrl } from "$lib/util/media";
	import { SelectionSet } from "$lib/util/selection.svelte";
	import { getConversationState } from "../../../conversation-state.svelte";
	import { getMessageComposerContext } from "../../message-composer-context.svelte";
	import type { TabSelection } from "../tabs";
	import { mediaMessageDraft } from "./media-messages";
	import SentOverlay from "./SentOverlay.svelte";

	let {
		onClose,
		onSelectionChange,
		expiring,
	}: {
		onClose: () => void;
		onSelectionChange: (selection: TabSelection) => void;
		expiring: boolean;
	} = $props();

	const composer = getMessageComposerContext();
	const conversationState = $derived(getConversationState()());
	const selected = new SelectionSet<number>(10);

	let media = $state<DrawerMedia[] | null>(null);
	let error = $state<unknown>(null);
	let uploadingCount = $state(0);

	async function load() {
		media = null;
		error = null;
		try {
			media = await getDrawerMedia(conversationState.conversationId);
		} catch (err) {
			console.error(err);
			error = err;
		}
	}

	void load();

	function addFailureMessage(err: unknown): string {
		if (err instanceof UnsupportedChatMediaError) return err.message;
		return (
			uploadRefusalMessage({
				error: err,
				limitLabel: CHAT_MEDIA_MAX_LABEL,
			}) ?? "Couldn't upload photo or video"
		);
	}

	async function addMedia() {
		let picked;
		try {
			picked = await pickMultipleMedia("media");
		} catch (err) {
			console.error(err);
			toast.error("Couldn't open the picker");
			return;
		}
		if (picked.length === 0) return;

		uploadingCount += picked.length;
		for (const item of picked) {
			try {
				const added = await addMediaToDrawer(item);
				media = [
					added,
					...(media ?? []).filter(({ id }) => id !== added.id),
				];
			} catch (err) {
				console.error(err);
				toast.error(addFailureMessage(err));
			} finally {
				uploadingCount--;
			}
		}
	}

	function toggleSelected(id: number) {
		selected.toggle(id);
		onSelectionChange({ count: selected.size, label: "Send" });
	}

	function defaultAlbumName(): string {
		return t("albumsKit.defaultName", {
			date: new Date().toLocaleDateString(),
		});
	}

	function selectedInOrder(): DrawerMedia[] {
		const byId = new Map((media ?? []).map((item) => [item.id, item]));
		return selected
			.values()
			.map((id) => byId.get(id))
			.filter((item): item is DrawerMedia => item !== undefined);
	}

	async function saveAsLocalAlbum() {
		const imageIds = selectedInOrder().map((item) => String(item.id));
		if (imageIds.length === 0) return;
		try {
			const album = createPhotoAlbum({
				name: defaultAlbumName(),
				imageIds,
			});
			await mutateStoredPhotoAlbums((current) =>
				upsertPhotoAlbum(current, album),
			);
			toast.success(t("albumsKit.saveLocalDone"));
		} catch (err) {
			console.error(err);
			toast.error(t("albumsKit.failed"));
		}
	}

	async function createRealAlbum() {
		const mediaIds = selectedInOrder().map((item) => item.id);
		if (mediaIds.length === 0) return;
		try {
			const result = await createRealAlbumFromDrawer({
				name: defaultAlbumName(),
				mediaIds,
			});
			if (result.status === "no-room") {
				toast.error(t("albumsKit.noRoom"));
			} else if (result.added < result.total) {
				toast.success(
					t("albumsKit.createRealTrimmed", {
						count: result.added,
						total: result.total,
					}),
				);
			} else {
				toast.success(
					t("albumsKit.createRealDone", { count: result.added }),
				);
			}
		} catch (err) {
			console.error(err);
			toast.error(t("albumsKit.failed"));
		}
	}

	function describe(item: DrawerMedia) {
		const video = mediaFileKindOf(item.contentType) === "video";
		return {
			key: item.id,
			src: proxyMediaUrl(item.url, { as: video ? "video" : "image" }),
			video,
		};
	}

	export function submitSelection() {
		if (media === null) return;
		const items = selectedInOrder();
		const sendAsExpiring = expiring;
		selected.clear();
		onClose();
		for (const item of items) item.used = true;
		void composer().sendMessages(
			items.map((item) =>
				mediaMessageDraft({ item, expiring: sendAsExpiring }),
			),
		);
	}
</script>

{#if selected.size > 0}
	<div data-slot="selection-actions" class="flex flex-wrap gap-2 px-3 pb-2">
		<Button
			variant="secondary"
			size="sm"
			onclick={() => void saveAsLocalAlbum()}
		>
			{t("albumsKit.saveLocal")}
		</Button>
		<Button
			variant="secondary"
			size="sm"
			onclick={() => void createRealAlbum()}
		>
			{t("albumsKit.createReal")}
		</Button>
	</div>
{/if}

<MediaSheetGrid
	items={media}
	{error}
	onRetry={() => void load()}
	{describe}
	{selected}
	onToggle={toggleSelected}
	emptyTitle="No media sent yet"
	addLabel="Upload photos or videos"
	onAdd={addMedia}
	pending={uploadingCount}
	remove={(item) => deleteDrawerMedia(item.id)}
	onRemoved={(item) => {
		media = (media ?? []).filter(({ id }) => id !== item.id);
	}}
>
	{#snippet overlay(item)}
		{#if item.used}
			<SentOverlay />
		{/if}
	{/snippet}
</MediaSheetGrid>
