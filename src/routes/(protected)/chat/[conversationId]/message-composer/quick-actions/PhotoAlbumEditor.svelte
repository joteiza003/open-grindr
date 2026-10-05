<script lang="ts">
	import { toast } from "svelte-sonner";

	import { showErrorToast } from "$lib/api/error-toast";
	import {
		createPhotoAlbum,
		mutateStoredPhotoAlbums,
		PHOTO_ALBUM_MAX_PHOTOS,
		PHOTO_ALBUM_NAME_MAX,
		removePhotoAlbum,
		upsertPhotoAlbum,
	} from "$lib/chat/photo-albums-library";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { t } from "$lib/i18n";
	import type { DrawerMedia } from "$lib/api/messaging/drawer";
	import type { PhotoAlbum } from "$lib/model/messaging/photo-albums";
	import PhotoAlbumTile from "./PhotoAlbumTile.svelte";

	let {
		album,
		drawer,
		onDone,
		onCancel,
	}: {
		/** Existing album to edit, or null to create a new one. */
		album: PhotoAlbum | null;
		drawer: DrawerMedia[];
		onDone: () => void;
		onCancel: () => void;
	} = $props();

	const initial = $derived(album);
	// Selection keeps click order: that is the order photos are sent in.
	let name = $state("");
	let selectedIds = $state<string[]>([]);
	let saving = $state(false);
	let confirmDelete = $state(false);
	let seeded = false;

	$effect(() => {
		if (seeded) return;
		seeded = true;
		name = initial?.name ?? "";
		const known = new Set(drawer.map((item) => String(item.id)));
		selectedIds = (initial?.imageIds ?? []).filter((id) => known.has(id));
	});

	// Photos the album references that are no longer in the drawer are kept
	// on save, so a temporarily missing photo isn't silently dropped.
	const orphanIds = $derived.by(() => {
		const known = new Set(drawer.map((item) => String(item.id)));
		return (initial?.imageIds ?? []).filter((id) => !known.has(id));
	});

	const sorted = $derived(
		[...drawer].sort((a, b) => b.createdTs - a.createdTs),
	);
	const canSave = $derived(
		!saving && name.trim() !== "" && selectedIds.length > 0,
	);

	function toggle(id: string) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((existing) => existing !== id);
		} else if (selectedIds.length < PHOTO_ALBUM_MAX_PHOTOS) {
			selectedIds = [...selectedIds, id];
		}
	}

	async function save() {
		if (!canSave) return;
		saving = true;
		try {
			const imageIds = [...selectedIds, ...orphanIds];
			const next = initial
				? {
						...initial,
						name: name.trim(),
						imageIds,
						coverImageId: imageIds.includes(initial.coverImageId)
							? initial.coverImageId
							: (imageIds[0] ?? ""),
					}
				: createPhotoAlbum({ name, imageIds });
			await mutateStoredPhotoAlbums((current) =>
				upsertPhotoAlbum(current, next),
			);
			toast.success(t("chat.albums.saved"));
			onDone();
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("chat.albums.saveError"), error });
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!initial || saving) return;
		if (!confirmDelete) {
			confirmDelete = true;
			return;
		}
		saving = true;
		try {
			await mutateStoredPhotoAlbums((current) =>
				removePhotoAlbum(current, initial.id),
			);
			toast.success(t("chat.albums.deleted"));
			onDone();
		} catch (error) {
			console.error(error);
			showErrorToast({ label: t("chat.albums.saveError"), error });
		} finally {
			saving = false;
		}
	}
</script>

<div class="flex flex-col gap-3">
	<h2 class="text-base font-semibold">
		{initial ? t("chat.albums.edit") : t("chat.albums.new")}
	</h2>
	<Input
		bind:value={name}
		maxlength={PHOTO_ALBUM_NAME_MAX}
		placeholder={t("chat.albums.namePlaceholder")}
		aria-label={t("chat.albums.name")}
	/>
	<p class="text-xs text-muted-foreground">
		{t("chat.albums.selectedCount", { count: selectedIds.length })} ·
		{t("chat.albums.orderHint")}
	</p>
	{#if sorted.length === 0}
		<p class="text-sm text-muted-foreground">
			{t("chat.albums.noDrawerPhotos")}
		</p>
	{:else}
		<div
			class="grid max-h-[45dvh] grid-cols-3 gap-1 overflow-y-auto rounded-xl"
		>
			{#each sorted as item, index (item.id)}
				{@const id = String(item.id)}
				{@const position = selectedIds.indexOf(id)}
				<div class="relative">
					<PhotoAlbumTile
						{item}
						{index}
						selected={position !== -1}
						onclick={() => toggle(id)}
					/>
					{#if position !== -1}
						<span
							class="pointer-events-none absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
						>
							{position + 1}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
	<div class="flex items-center gap-2">
		{#if initial}
			<Button
				type="button"
				variant={confirmDelete ? "destructive" : "ghost"}
				disabled={saving}
				onclick={() => void remove()}
			>
				{confirmDelete
					? t("chat.albums.deleteConfirm")
					: t("chat.albums.delete")}
			</Button>
		{/if}
		<div class="flex-1"></div>
		<Button
			type="button"
			variant="ghost"
			disabled={saving}
			onclick={onCancel}
		>
			{t("chat.albums.cancel")}
		</Button>
		<Button type="button" disabled={!canSave} onclick={() => void save()}>
			{t("chat.albums.save")}
		</Button>
	</div>
</div>
