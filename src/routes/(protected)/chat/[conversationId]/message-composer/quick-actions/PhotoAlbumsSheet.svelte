<script lang="ts">
	import ImagesIcon from "phosphor-svelte/lib/ImagesIcon";
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		type DrawerMedia,
		getDrawerMedia,
	} from "$lib/api/messaging/drawer";
	import {
		albumsWithRecents,
		loadStoredPhotoAlbums,
		resolveAlbumMedia,
	} from "$lib/chat/photo-albums-library";
	import {
		albumSendLock,
		orderedAlbumMedia,
	} from "$lib/chat/send-photo-album";
	import { Button } from "$lib/components/ui/button";
	import * as Drawer from "$lib/components/ui/drawer";
	import * as Empty from "$lib/components/ui/empty";
	import { dismissOnBackGesture } from "$lib/platform/back-gesture-event.svelte";
	import type { PhotoAlbum } from "$lib/model/messaging/photo-albums";
	import { mediaMessageDraft } from "../attachments/media/media-messages";
	import { getMessageComposerContext } from "../message-composer-context.svelte";

	let {
		conversationId,
		disabled = false,
		open = $bindable(false),
	}: {
		conversationId: string;
		disabled?: boolean;
		open?: boolean;
	} = $props();

	const composer = getMessageComposerContext();

	let drawer = $state<DrawerMedia[]>([]);
	let albums = $state<PhotoAlbum[]>([]);
	let loading = $state(false);
	let progress = $state<{
		albumId: string;
		sent: number;
		total: number;
		failed: number;
	} | null>(null);

	const sending = $derived(albumSendLock.inflightAlbumId !== null);

	dismissOnBackGesture({
		active: () => open,
		dismiss: () => {
			open = false;
		},
	});

	async function load() {
		loading = true;
		try {
			const [media, stored] = await Promise.all([
				getDrawerMedia(conversationId),
				loadStoredPhotoAlbums(),
			]);
			drawer = media;
			albums = albumsWithRecents({ stored, drawer: media });
		} catch (error) {
			console.error(error);
			showErrorToast({ label: "Couldn't load albums", error });
			albums = [];
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!open) return;
		void load();
	});

	function coverUrl(album: PhotoAlbum): string | null {
		const coverId = album.coverImageId || album.imageIds[0];
		if (!coverId) return null;
		return drawer.find((item) => String(item.id) === coverId)?.url ?? null;
	}

	function availabilityLabel(album: PhotoAlbum): string {
		const { available, missingIds, total } = resolveAlbumMedia({
			album,
			drawer,
		});
		if (total === 0) return "0 fotos";
		if (missingIds.length === 0) return `${available.length} fotos`;
		return `${available.length} de ${total} fotos disponibles`;
	}

	async function sendAlbum(album: PhotoAlbum) {
		if (disabled || sending) return;
		const { items, missing, total } = orderedAlbumMedia({ album, drawer });
		if (items.length === 0) {
			toast.error(
				total === 0
					? "This album is empty."
					: "None of this album's photos are available.",
			);
			return;
		}
		if (!albumSendLock.tryBegin(album.id)) return;
		open = false;
		progress = {
			albumId: album.id,
			sent: 0,
			total: items.length,
			failed: 0,
		};
		if (missing > 0) {
			toast.warning(
				`Sending ${items.length} of ${total} photos. ${missing} no longer available.`,
			);
		} else {
			toast.message(`Enviando fotos… 0 / ${items.length}`);
		}
		try {
			for (const item of items) {
				try {
					await composer().sendMessages([
						mediaMessageDraft({ item, expiring: false }),
					]);
					progress = progress
						? { ...progress, sent: progress.sent + 1 }
						: progress;
				} catch (error) {
					console.error(error);
					progress = progress
						? { ...progress, failed: progress.failed + 1 }
						: progress;
				}
				if (progress) {
					toast.message(
						`Enviando fotos… ${progress.sent} / ${progress.total}`,
					);
				}
			}
			if (progress && progress.failed > 0) {
				toast.error(
					`${progress.failed} photo${progress.failed === 1 ? "" : "s"} could not be sent.`,
				);
			}
		} finally {
			albumSendLock.end(album.id);
			progress = null;
		}
	}
</script>

<Button
	type="button"
	variant="ghost"
	size="icon"
	class="size-9 shrink-0 rounded-full"
	aria-label="Fotos"
	title="Fotos"
	disabled={disabled || sending}
	onclick={() => (open = true)}
>
	<ImagesIcon
		weight="fill"
		class="size-4.5"
		color="var(--muted-foreground)"
	/>
</Button>

<Drawer.Root bind:open>
	<Drawer.Content class="mx-auto max-w-200">
		<div class="px-4 pb-6">
			<div
				data-slot="drawer-handle"
				class="mx-auto my-3 h-1.5 w-25 rounded-full bg-muted"
			></div>
			<h2 class="mb-3 text-base font-semibold">Fotos</h2>
			{#if loading}
				<p class="text-sm text-muted-foreground">Loading albums…</p>
			{:else if albums.length === 0}
				<Empty.Root>
					<Empty.Header>
						<Empty.Title>No albums yet</Empty.Title>
						<Empty.Description>
							Virtual albums group photos already in your chat
							drawer. They do not copy the files.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<ul class="flex flex-col gap-2">
					{#each albums as album (album.id)}
						{@const cover = coverUrl(album)}
						{@const available = resolveAlbumMedia({ album, drawer })
							.available.length}
						<li>
							<button
								type="button"
								class="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-2 text-left disabled:opacity-50"
								disabled={sending || available === 0}
								onclick={() => void sendAlbum(album)}
							>
								<span
									class="size-14 shrink-0 overflow-hidden rounded-xl bg-muted"
								>
									{#if cover}
										<img
											src={cover}
											alt=""
											class="size-full object-cover"
										/>
									{/if}
								</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate font-medium">
										{album.name}
									</span>
									<span
										class="block text-xs text-muted-foreground"
									>
										{availabilityLabel(album)}
									</span>
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</Drawer.Content>
</Drawer.Root>
