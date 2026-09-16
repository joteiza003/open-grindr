<script lang="ts">
	import "photoswipe/style.css";
	import {
		CaretLeftIcon,
		MagnifyingGlassIcon,
		StarIcon,
	} from "phosphor-svelte";
	import { onMount } from "svelte";

	import { showErrorToast } from "$lib/api/error-toast";
	import { openSavedAlbum } from "$lib/chat/album-viewer";
	import { SavedAlbumsState } from "$lib/chat/saved-albums-state.svelte";
	import AlbumCard from "$lib/components/chat/AlbumCard.svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import type { SavedAlbum } from "$lib/model/messaging/saved-albums";

	const library = new SavedAlbumsState();

	onMount(() => {
		void library.load();
	});

	let deleteTarget = $state<SavedAlbum | null>(null);
	let tagTarget = $state<SavedAlbum | null>(null);
	let tagDraft = $state("");

	function open(album: SavedAlbum): void {
		openSavedAlbum(album).catch((error: unknown) => {
			showErrorToast({ label: "Failed to open album", error });
		});
	}

	function startEditTags(album: SavedAlbum): void {
		tagTarget = album;
		tagDraft = album.tags.join(", ");
	}

	function saveTags(): void {
		if (tagTarget === null) return;
		const tags = tagDraft.split(",").map((tag) => tag.trim());
		void library.setTags(tagTarget.localId, tags);
		tagTarget = null;
	}
</script>

<main
	class="relative flex h-dvh w-full flex-col pt-(--safe-area-top) pb-(--safe-area-bottom)"
>
	<header class="flex flex-col gap-3 px-4 pt-3 pb-2">
		<div class="flex items-center gap-2">
			<a
				href="/settings"
				class="grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors can-hover:hover:bg-muted"
				aria-label="Back"
			>
				<CaretLeftIcon class="size-5" />
			</a>
			<h1 class="text-xl font-semibold tracking-tight">Saved albums</h1>
		</div>

		<div class="flex items-center gap-2">
			<div class="relative min-w-0 flex-1">
				<MagnifyingGlassIcon
					class="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					bind:value={library.query}
					placeholder="Search by name or tag…"
					aria-label="Search saved albums"
					class="ps-9"
				/>
			</div>
			<Button
				variant={library.favoritesOnly ? "default" : "outline"}
				size="icon"
				class="size-9 shrink-0"
				aria-label="Show favorites only"
				aria-pressed={library.favoritesOnly}
				onclick={() => (library.favoritesOnly = !library.favoritesOnly)}
			>
				<StarIcon
					class="size-4"
					weight={library.favoritesOnly ? "fill" : "regular"}
				/>
			</Button>
		</div>

		{#if library.allTags.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each library.allTags as tag (tag)}
					<button
						type="button"
						class={[
							"rounded-full border px-2.5 py-0.5 text-xs transition-colors",
							{
								"border-transparent bg-primary text-primary-foreground":
									library.selectedTag === tag,
								"border-border text-muted-foreground can-hover:hover:bg-muted":
									library.selectedTag !== tag,
							},
						]}
						onclick={() =>
							(library.selectedTag =
								library.selectedTag === tag ? null : tag)}
					>
						{tag}
					</button>
				{/each}
			</div>
		{/if}
	</header>

	<div class="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
		{#if library.loading}
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each Array.from({ length: 6 })}
					<div
						class="aspect-square animate-pulse rounded-2xl bg-muted"
					></div>
				{/each}
			</div>
		{:else if library.filtered.length === 0}
			<div class="grid min-h-full place-items-center p-8 text-center">
				<div>
					<h2 class="text-lg font-semibold">No saved albums</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Open an album in a chat and tap save to keep it here.
					</p>
				</div>
			</div>
		{:else}
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each library.filtered as album (album.localId)}
					<AlbumCard
						{album}
						onOpen={() => open(album)}
						onToggleFavorite={() =>
							void library.toggleFavorite(album.localId)}
						onEditTags={() => startEditTags(album)}
						onDelete={() => (deleteTarget = album)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</main>

<AlertDialog.Root
	open={deleteTarget !== null}
	onOpenChange={(value) => {
		if (!value) deleteTarget = null;
	}}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete this saved album?</AlertDialog.Title>
			<AlertDialog.Description>
				The local copy and its media will be removed from your library.
				This cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				variant="destructive"
				size="lg"
				onclick={() => {
					const target = deleteTarget;
					deleteTarget = null;
					if (target) void library.remove(target.localId);
				}}
			>
				Delete
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<ResponsiveDialog.Root
	open={tagTarget !== null}
	onOpenChange={(value) => {
		if (!value) tagTarget = null;
	}}
>
	<ResponsiveDialog.Content
		class="flex flex-col gap-4"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header>
			<ResponsiveDialog.Title>Edit tags</ResponsiveDialog.Title>
			<ResponsiveDialog.Description class="sr-only">
				Comma-separated private tags for this album.
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body>
			<Input
				bind:value={tagDraft}
				placeholder="e.g. gym, travel"
				aria-label="Tags, comma separated"
			/>
		</ResponsiveDialog.Body>
		<ResponsiveDialog.Footer>
			<Button onclick={saveTags}>Save</Button>
		</ResponsiveDialog.Footer>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
