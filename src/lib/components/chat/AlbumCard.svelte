<script lang="ts">
	import {
		DotsThreeVerticalIcon,
		ImagesIcon,
		StarIcon,
		TagIcon,
		TrashIcon,
	} from "phosphor-svelte";

	import { savedMediaUrl } from "$lib/chat/saved-album-library";
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger,
	} from "$lib/components/ui/dropdown-menu";
	import type { SavedAlbum } from "$lib/model/messaging/saved-albums";

	let {
		album,
		onOpen,
		onToggleFavorite,
		onEditTags,
		onDelete,
	}: {
		album: SavedAlbum;
		onOpen: () => void;
		onToggleFavorite: () => void;
		onEditTags: () => void;
		onDelete: () => void;
	} = $props();

	const coverSource = $derived(
		album.coverPath ??
			album.items[0]?.thumbnailPath ??
			album.items[0]?.localPath ??
			null,
	);

	let coverUrl = $state<string | null>(null);

	$effect(() => {
		const path = coverSource;
		if (path === null) {
			coverUrl = null;
			return;
		}
		let url: string | null = null;
		let cancelled = false;
		void savedMediaUrl(path, "image/jpeg")
			.then((loaded) => {
				if (cancelled) {
					if (loaded) URL.revokeObjectURL(loaded);
					return;
				}
				url = loaded;
				coverUrl = loaded;
			})
			.catch((error: unknown) => console.error(error));
		return () => {
			cancelled = true;
			if (url) URL.revokeObjectURL(url);
			coverUrl = null;
		};
	});

	const label = $derived(
		album.profileSnapshot.displayName ??
			(album.senderId !== null ? `#${album.senderId}` : "Album"),
	);
</script>

<div class="relative aspect-square overflow-hidden rounded-2xl bg-muted">
	<button
		type="button"
		class="absolute inset-0 text-start"
		aria-label="Open album from {label}"
		onclick={onOpen}
	>
		{#if coverUrl}
			<img
				src={coverUrl}
				alt=""
				class="size-full object-cover"
				draggable="false"
			/>
		{:else}
			<div class="grid size-full place-items-center">
				<ImagesIcon class="size-8 text-muted-foreground" />
			</div>
		{/if}
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2.5 pt-8 text-white"
		>
			<p class="truncate text-sm font-medium">{label}</p>
			<p class="text-xs opacity-80">
				{album.items.length}
				{album.items.length === 1 ? "item" : "items"}
				{#if album.sourceTemporary}· temporary{/if}
			</p>
			{#if album.tags.length > 0}
				<div class="mt-1 flex flex-wrap gap-1">
					{#each album.tags.slice(0, 3) as tag (tag)}
						<span
							class="rounded-full bg-white/15 px-1.5 py-0.5 text-2xs"
						>
							{tag}
						</span>
					{/each}
				</div>
			{/if}
		</div>
	</button>

	<div class="absolute end-1 top-1 flex items-center gap-1">
		<button
			type="button"
			class="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors can-hover:hover:bg-black/60"
			aria-label={album.favorite ? "Remove favorite" : "Mark favorite"}
			aria-pressed={album.favorite}
			onclick={onToggleFavorite}
		>
			<StarIcon
				class={["size-4", { "text-yellow-400": album.favorite }]}
				weight={album.favorite ? "fill" : "regular"}
			/>
		</button>
		<DropdownMenu>
			<DropdownMenuTrigger
				class="grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-colors can-hover:hover:bg-black/60"
				aria-label="Album actions"
			>
				<DotsThreeVerticalIcon class="size-4" weight="bold" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onSelect={onEditTags}>
					<TagIcon class="size-4" />
					Edit tags
				</DropdownMenuItem>
				<DropdownMenuItem variant="destructive" onSelect={onDelete}>
					<TrashIcon class="size-4" />
					Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
</div>
