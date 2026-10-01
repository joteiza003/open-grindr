import { SvelteSet } from "svelte/reactivity";

import { getProfiles } from "$lib/api/users/profiles";
import { getGrid } from "$lib/grid/grid";
import { buildCascadeQuery } from "$lib/grid/grid-query";
import { defaultFilters } from "$lib/model/browse/grid/filters";
import {
	type RightNowPost,
	sortRightNowPosts,
	toRightNowPost,
} from "./right-now-post";

/**
 * Feed de Right Now: perfiles cercanos con una publicación activa. Se obtiene
 * de la cuadrícula con el filtro `rightNow` y los datos de cada perfil.
 */
export class RightNowFeed {
	posts = $state<RightNowPost[]>([]);
	loading = $state(false);
	loadingMore = $state(false);
	error = $state<unknown>(null);
	loaded = $state(false);
	#nextPage: number | null = null;
	#geohash: string | null = null;
	#generation = 0;

	get hasMore(): boolean {
		return this.#nextPage !== null && this.#nextPage > 0;
	}

	async load(geohash: string): Promise<void> {
		const generation = ++this.#generation;
		this.#geohash = geohash;
		this.loading = true;
		this.error = null;
		try {
			const { posts, nextPage } = await this.#fetchPage({ geohash });
			if (generation !== this.#generation) return;
			this.posts = sortRightNowPosts(posts);
			this.#nextPage = nextPage;
			this.loaded = true;
		} catch (error) {
			if (generation !== this.#generation) return;
			console.error("[right-now] Failed to load", error);
			this.error = error;
		} finally {
			if (generation === this.#generation) this.loading = false;
		}
	}

	async loadMore(): Promise<void> {
		const geohash = this.#geohash;
		const page = this.#nextPage;
		if (geohash === null || page === null || page <= 0 || this.loadingMore)
			return;
		const generation = this.#generation;
		this.loadingMore = true;
		try {
			const { posts, nextPage } = await this.#fetchPage({
				geohash,
				page,
			});
			if (generation !== this.#generation) return;
			const known = new SvelteSet(
				this.posts.map((post) => post.profileId),
			);
			this.posts = sortRightNowPosts([
				...this.posts,
				...posts.filter((post) => !known.has(post.profileId)),
			]);
			this.#nextPage = nextPage;
		} catch (error) {
			console.error("[right-now] Failed to load more", error);
		} finally {
			if (generation === this.#generation) this.loadingMore = false;
		}
	}

	async #fetchPage({
		geohash,
		page,
	}: {
		geohash: string;
		page?: number;
	}): Promise<{ posts: RightNowPost[]; nextPage: number | null }> {
		const query = buildCascadeQuery({
			geohash,
			filters: { ...defaultFilters, isRightNow: true },
		});
		const { items, nextPage } = await getGrid(
			page === undefined ? query : { ...query, pageNumber: page },
		);
		const ids = items.map((item) => item.id);
		const profiles = await getProfiles(ids);
		const posts: RightNowPost[] = [];
		for (const profile of profiles) {
			const post = toRightNowPost(profile);
			if (post) posts.push(post);
		}
		return { posts, nextPage: nextPage ?? null };
	}

	reset(): void {
		this.#generation++;
		this.posts = [];
		this.loaded = false;
		this.loading = false;
		this.loadingMore = false;
		this.error = null;
		this.#nextPage = null;
		this.#geohash = null;
	}
}

export const rightNowFeed = new RightNowFeed();
