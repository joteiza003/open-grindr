import { beforeEach, describe, expect, it, vi } from "vitest";

const download = vi.hoisted(() => vi.fn());
const write = vi.hoisted(() => vi.fn());
const upsert = vi.hoisted(() => vi.fn());
const proxy = vi.hoisted(() =>
	vi.fn((url: string | null | undefined, options?: { as?: string }) =>
		typeof url === "string"
			? `proxied:${options?.as ?? "image"}:${url}`
			: null,
	),
);

vi.mock("$lib/api/messaging/albums", () => ({
	getAlbumContent: vi.fn(() => Promise.resolve({ content: [] })),
}));
vi.mock("$lib/util/media", () => ({ proxyMediaUrl: proxy }));
vi.mock("./saved-album-library", () => ({
	downloadMediaBytes: download,
	mediaFileName: (storageId: string, key: string) =>
		`album-media__${storageId}__${key}.bin`,
	upsertSavedAlbum: upsert,
	writeMediaFile: write,
}));

import type { AlbumMessage } from "$lib/model/messaging/messages";
import { saveAlbumToLibrary } from "./archive-album";

const body = {
	albumId: 7,
	ownerProfileId: 3,
	coverUrl: "https://cdn.test/cover.jpg",
	expirationType: null,
	expiresAt: null,
} as unknown as AlbumMessage["body"];

const snapshot = {
	profileId: 3,
	displayName: "Ana",
	age: null,
	distance: null,
};

function slide(overrides: Record<string, unknown> = {}) {
	return {
		contentId: 1,
		contentType: "image/jpeg",
		url: "proxied:image:https://cdn.test/1.jpg",
		sourceUrl: "https://cdn.test/1.jpg",
		thumbUrl: "https://cdn.test/1_thumb.jpg",
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
	download.mockResolvedValue(new Uint8Array([1, 2, 3]));
	write.mockResolvedValue(undefined);
	upsert.mockResolvedValue(undefined);
});

describe("saveAlbumToLibrary", () => {
	it("downloads whole files through the buffering image fetcher, video included", async () => {
		await saveAlbumToLibrary({
			body,
			conversationId: "c1",
			profileSnapshot: snapshot,
			content: [
				slide(),
				slide({
					contentId: 2,
					contentType: "video/mp4",
					sourceUrl: "https://cdn.test/2.mp4",
					url: "proxied:video:https://cdn.test/2.mp4",
				}),
			],
		});

		expect(download).toHaveBeenCalledWith(
			"proxied:image:https://cdn.test/2.mp4",
		);
		expect(download).not.toHaveBeenCalledWith(
			expect.stringContaining("proxied:video"),
		);
		expect(upsert).toHaveBeenCalledTimes(1);
		expect(upsert.mock.calls[0]?.[0].items).toHaveLength(2);
	});

	it("keeps the slides that saved when another one fails", async () => {
		download
			.mockResolvedValueOnce(new Uint8Array([1]))
			.mockResolvedValueOnce(new Uint8Array([1]))
			.mockRejectedValueOnce(
				new Error("Media fetch failed with status 500"),
			);

		const saved = await saveAlbumToLibrary({
			body,
			conversationId: "c1",
			profileSnapshot: snapshot,
			content: [slide(), slide({ contentId: 2 })],
		});

		expect(saved.items.map((item) => item.contentId)).toEqual([1]);
	});

	it("says why nothing could be saved", async () => {
		download.mockRejectedValue(
			new Error("Media fetch failed with status 404"),
		);

		await expect(
			saveAlbumToLibrary({
				body,
				conversationId: "c1",
				profileSnapshot: snapshot,
				content: [slide(), slide({ contentId: 2 })],
			}),
		).rejects.toThrow(
			/no downloadable media \(#1: Media fetch failed with status 404; #2: Media fetch failed with status 404\)/,
		);
		expect(upsert).not.toHaveBeenCalled();
	});

	it("reports an album that arrived without any slides", async () => {
		await expect(
			saveAlbumToLibrary({
				body,
				conversationId: "c1",
				profileSnapshot: snapshot,
				content: [],
			}),
		).rejects.toThrow("This album has no media to save");
	});
});
