import { decode, encode } from "@msgpack/msgpack";
import { toast } from "svelte-sonner";
import z from "zod";

import {
	existsAppDataFile,
	readAppDataFile,
	removeAppDataFile,
	writeAppDataFileAtomic,
} from ".";

/**
 * Local, user-authored metadata attached to a Grindr profile by id.
 *
 * This layer is deliberately kept SEPARATE from the Grindr profile model
 * (`$lib/model/users/profiles`). It never mutates or shadows server data:
 * a profile is `Grindr data` + `local metadata`, joined only by profile id.
 *
 * `favorite` is intentionally absent — favorites are a native Grindr concept
 * (`$lib/api/users/favorites`) and must not be duplicated here. Likewise
 * `tags` here are the user's own private labels, distinct from Grindr's
 * `profileTags` / profile hashtags.
 *
 * Persistence reuses the existing app-data storage engine (msgpack + atomic
 * write), but in its own document `profile-metadata.data` rather than the
 * single `preferences.data` blob: this store is per-profile and unbounded, so
 * folding it into preferences would rewrite every preference on each note edit.
 */

const MAX_NOTE_LENGTH = 2000;
const MAX_TAG_LENGTH = 48;
const MAX_TAGS_PER_PROFILE = 32;

/** Limits surfaced to UI so inputs can enforce the same bounds as the store. */
export const profileTagLimits = {
	maxTagLength: MAX_TAG_LENGTH,
	maxTags: MAX_TAGS_PER_PROFILE,
} as const;

const localProfileMetadataSchema = z.object({
	tags: z.array(z.string()).default([]),
	note: z.string().optional(),
	lastViewed: z.number().optional(),
	lastInteraction: z.number().optional(),
	hidden: z.boolean().optional(),
});

export type LocalProfileMetadata = z.infer<typeof localProfileMetadataSchema>;

/** Map of `String(profileId)` -> metadata. */
const storeSchema = z
	.record(z.string(), localProfileMetadataSchema)
	.default({});

type Store = z.infer<typeof storeSchema>;

const FILE = "profile-metadata.data";

const EMPTY: Readonly<LocalProfileMetadata> = Object.freeze({ tags: [] });

let writeQueue: Promise<unknown> = Promise.resolve();
let snapshot = $state<Store>({});
let loaded = $state(false);

let cache: Store | null = null;
let hydrating: Promise<Store> | null = null;

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
	const run = writeQueue.then(task);
	writeQueue = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

function publish(store: Store): void {
	cache = store;
	snapshot = store;
	loaded = true;
}

async function readFromDisk(): Promise<Store> {
	if (!(await existsAppDataFile(FILE))) return storeSchema.parse({});
	const bytes = await readAppDataFile(FILE);
	return storeSchema.parse(decode(bytes));
}

async function getStore(): Promise<Store> {
	if (cache !== null) return structuredClone(cache);
	hydrating ??= readFromDisk()
		.then((store) => {
			publish(store);
			return store;
		})
		.catch((error: unknown) => {
			console.error(error);
			toast.error("Failed to load profile notes and tags.");
			// Fall back to an empty store so the app stays usable; the on-disk
			// file is left untouched for a later successful read.
			publish(storeSchema.parse({}));
			return cache ?? storeSchema.parse({});
		})
		.finally(() => {
			hydrating = null;
		});
	return structuredClone(await hydrating);
}

export async function hydrateProfileMetadata(): Promise<void> {
	await getStore();
}

export function profileMetadataLoaded(): boolean {
	return loaded;
}

/** Reactive snapshot of the whole store. Prefer `profileMetadata(id)`. */
export function profileMetadataSnapshot(): Store {
	return snapshot;
}

/**
 * Reactive metadata for a single profile. Always returns a normalized object
 * (never undefined) so callers can read `.tags` etc. without guards.
 */
export function profileMetadata(profileId: number): LocalProfileMetadata {
	return snapshot[String(profileId)] ?? EMPTY;
}

function isEmptyMetadata(meta: LocalProfileMetadata): boolean {
	return (
		meta.tags.length === 0 &&
		(meta.note === undefined || meta.note === "") &&
		meta.lastViewed === undefined &&
		meta.lastInteraction === undefined &&
		!meta.hidden
	);
}

function normalizeTag(tag: string): string {
	return tag.trim().slice(0, MAX_TAG_LENGTH);
}

/**
 * Apply a patch to one profile's metadata via a queued, atomic disk write.
 * Empty metadata (no tags, note, timestamps, or hidden flag) is pruned so the
 * file only ever holds profiles the user has actually annotated.
 */
export async function updateProfileMetadata(
	profileId: number,
	patch: Partial<LocalProfileMetadata>,
): Promise<void> {
	await enqueueWrite(async () => {
		const store = await getStore();
		const key = String(profileId);
		const current = store[key] ?? { tags: [] };
		const next = localProfileMetadataSchema.parse({ ...current, ...patch });

		const updated: Store = { ...store };
		if (isEmptyMetadata(next)) {
			delete updated[key];
		} else {
			updated[key] = next;
		}
		await persist(updated);
	});
}

async function persist(store: Store): Promise<void> {
	if (Object.keys(store).length === 0) {
		publish(store);
		await removeAppDataFile(FILE);
		return;
	}
	await writeAppDataFileAtomic({ path: FILE, content: encode(store) });
	publish(store);
}

export async function setProfileNote(
	profileId: number,
	note: string,
): Promise<void> {
	const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
	await updateProfileMetadata(profileId, {
		note: trimmed === "" ? undefined : trimmed,
	});
}

export async function setProfileTags(
	profileId: number,
	tags: string[],
): Promise<void> {
	const seenLower: string[] = [];
	const normalized: string[] = [];
	for (const tag of tags) {
		const clean = normalizeTag(tag);
		const dedupeKey = clean.toLowerCase();
		if (clean === "" || seenLower.includes(dedupeKey)) continue;
		seenLower.push(dedupeKey);
		normalized.push(clean);
		if (normalized.length >= MAX_TAGS_PER_PROFILE) break;
	}
	await updateProfileMetadata(profileId, { tags: normalized });
}

export async function addProfileTag(
	profileId: number,
	tag: string,
): Promise<void> {
	const current = profileMetadata(profileId).tags;
	await setProfileTags(profileId, [...current, tag]);
}

export async function removeProfileTag(
	profileId: number,
	tag: string,
): Promise<void> {
	const target = normalizeTag(tag).toLowerCase();
	const next = profileMetadata(profileId).tags.filter(
		(existing) => existing.toLowerCase() !== target,
	);
	await setProfileTags(profileId, next);
}

export async function toggleProfileTag(
	profileId: number,
	tag: string,
): Promise<void> {
	const target = normalizeTag(tag).toLowerCase();
	const has = profileMetadata(profileId).tags.some(
		(existing) => existing.toLowerCase() === target,
	);
	if (has) await removeProfileTag(profileId, tag);
	else await addProfileTag(profileId, tag);
}

export async function setProfileHidden(
	profileId: number,
	hidden: boolean,
): Promise<void> {
	await updateProfileMetadata(profileId, { hidden: hidden || undefined });
}

/** Record that the user opened this profile (local view history). */
export async function recordProfileView(
	profileId: number,
	at: number = Date.now(),
): Promise<void> {
	await updateProfileMetadata(profileId, { lastViewed: at });
}

/** Record a local interaction (e.g. opened chat, tapped) for sorting. */
export async function recordProfileInteraction(
	profileId: number,
	at: number = Date.now(),
): Promise<void> {
	await updateProfileMetadata(profileId, { lastInteraction: at });
}

export async function clearProfileMetadata(profileId: number): Promise<void> {
	await enqueueWrite(async () => {
		const store = await getStore();
		const key = String(profileId);
		if (!(key in store)) return;
		const updated: Store = { ...store };
		delete updated[key];
		await persist(updated);
	});
}

/** Distinct tags used across all profiles, sorted case-insensitively. */
export function allProfileTags(): string[] {
	const seen: Record<string, string> = {};
	for (const meta of Object.values(snapshot)) {
		for (const tag of meta.tags) {
			const key = tag.toLowerCase();
			if (!(key in seen)) seen[key] = tag;
		}
	}
	return Object.values(seen).sort((a, b) =>
		a.localeCompare(b, undefined, { sensitivity: "base" }),
	);
}

/** Profile ids carrying a given tag (case-insensitive). */
export function profileIdsWithTag(tag: string): number[] {
	const target = normalizeTag(tag).toLowerCase();
	const ids: number[] = [];
	for (const [key, meta] of Object.entries(snapshot)) {
		if (meta.tags.some((existing) => existing.toLowerCase() === target)) {
			ids.push(Number(key));
		}
	}
	return ids;
}

/** Profile ids the user viewed locally, most recent first. */
export function recentlyViewedProfileIds(limit = 50): number[] {
	return Object.entries(snapshot)
		.filter(([, meta]) => meta.lastViewed !== undefined)
		.sort(([, a], [, b]) => (b.lastViewed ?? 0) - (a.lastViewed ?? 0))
		.slice(0, limit)
		.map(([key]) => Number(key));
}
