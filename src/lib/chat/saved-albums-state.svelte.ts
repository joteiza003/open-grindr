import type { SavedAlbum } from "$lib/model/messaging/saved-albums";
import {
	deleteSavedAlbum,
	loadSavedAlbums,
	updateSavedAlbum,
} from "./saved-album-library";

/** Reactive view-model for the saved-album library screen. */
export class SavedAlbumsState {
	albums = $state<SavedAlbum[]>([]);
	loading = $state(true);
	query = $state("");
	favoritesOnly = $state(false);
	selectedTag = $state<string | null>(null);

	async load(): Promise<void> {
		this.loading = true;
		try {
			this.albums = await loadSavedAlbums();
		} catch (error) {
			console.error("[album-library] Failed to load", error);
			this.albums = [];
		} finally {
			this.loading = false;
		}
	}

	readonly allTags = $derived.by(() => {
		const seen: Record<string, string> = {};
		for (const album of this.albums) {
			for (const tag of album.tags) {
				const key = tag.toLowerCase();
				if (!(key in seen)) seen[key] = tag;
			}
		}
		return Object.values(seen).sort((a, b) =>
			a.localeCompare(b, undefined, { sensitivity: "base" }),
		);
	});

	readonly filtered = $derived.by(() => {
		const query = this.query.trim().toLowerCase();
		const tag = this.selectedTag?.toLowerCase() ?? null;
		return this.albums.filter((album) => {
			if (album.hidden) return false;
			if (this.favoritesOnly && !album.favorite) return false;
			if (
				tag !== null &&
				!album.tags.some((existing) => existing.toLowerCase() === tag)
			) {
				return false;
			}
			if (query === "") return true;
			const name = album.profileSnapshot.displayName?.toLowerCase() ?? "";
			return (
				name.includes(query) ||
				album.tags.some((existing) =>
					existing.toLowerCase().includes(query),
				)
			);
		});
	});

	async toggleFavorite(localId: string): Promise<void> {
		const album = this.albums.find((a) => a.localId === localId);
		if (!album) return;
		const updated = await updateSavedAlbum(localId, {
			favorite: !album.favorite,
		});
		if (updated) this.#replace(updated);
	}

	async setTags(localId: string, tags: string[]): Promise<void> {
		const normalized: string[] = [];
		const seenLower: string[] = [];
		for (const raw of tags) {
			const clean = raw.trim().slice(0, 48);
			const lower = clean.toLowerCase();
			if (clean === "" || seenLower.includes(lower)) continue;
			seenLower.push(lower);
			normalized.push(clean);
		}
		const updated = await updateSavedAlbum(localId, { tags: normalized });
		if (updated) this.#replace(updated);
	}

	async remove(localId: string): Promise<void> {
		await deleteSavedAlbum(localId);
		this.albums = this.albums.filter((a) => a.localId !== localId);
	}

	#replace(album: SavedAlbum): void {
		this.albums = this.albums.map((a) =>
			a.localId === album.localId ? album : a,
		);
	}
}
