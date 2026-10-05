import { describe, expect, it } from "vitest";

import {
	directConversationId,
	type RightNowSource,
	sortRightNowPosts,
	toRightNowPost,
} from "./right-now-post";

function source(overrides: Partial<RightNowSource> = {}): RightNowSource {
	return {
		profileId: 7,
		displayName: "Iker",
		age: 31,
		showAge: true,
		distance: 1200,
		showDistance: true,
		medias: [{ mediaHash: "abc" }],
		rightNowText: "  Tomando algo  ",
		rightNowPosted: 1000,
		rightNowDistance: null,
		rightNowThumbnailUrl: null,
		rightNowFullImageUrl: null,
		...overrides,
	};
}

describe("toRightNowPost", () => {
	it("builds a post from a profile with text", () => {
		expect(toRightNowPost(source())).toMatchObject({
			profileId: 7,
			text: "Tomando algo",
			age: 31,
			distance: 1200,
			mediaHash: "abc",
			postedAt: 1000,
		});
	});

	it("returns null when nothing is published", () => {
		expect(toRightNowPost(source({ rightNowText: "   " }))).toBeNull();
		expect(toRightNowPost(source({ rightNowText: null }))).toBeNull();
	});

	it("accepts an image-only post", () => {
		const post = toRightNowPost(
			source({
				rightNowText: null,
				rightNowFullImageUrl: "https://x/full.jpg",
			}),
		);
		expect(post?.imageUrl).toBe("https://x/full.jpg");
		expect(post?.thumbnailUrl).toBe("https://x/full.jpg");
	});

	it("respects what the person chose to show", () => {
		const post = toRightNowPost(
			source({ showAge: false, showDistance: false }),
		);
		expect(post?.age).toBeNull();
		expect(post?.distance).toBeNull();
	});

	it("prefers the post's own distance", () => {
		expect(
			toRightNowPost(source({ rightNowDistance: 300 }))?.distance,
		).toBe(300);
	});
});

describe("sortRightNowPosts", () => {
	it("puts the newest first and undated posts last by distance", () => {
		const posts = [
			toRightNowPost(source({ profileId: 1, rightNowPosted: 10 })),
			toRightNowPost(source({ profileId: 2, rightNowPosted: 30 })),
			toRightNowPost(
				source({ profileId: 3, rightNowPosted: null, distance: 500 }),
			),
			toRightNowPost(
				source({ profileId: 4, rightNowPosted: null, distance: 100 }),
			),
		].filter((post) => post !== null);
		expect(sortRightNowPosts(posts).map((post) => post.profileId)).toEqual([
			2, 1, 4, 3,
		]);
	});
});

describe("directConversationId", () => {
	it("is the same for both directions", () => {
		expect(directConversationId(9, 4)).toBe("4:9");
		expect(directConversationId(4, 9)).toBe("4:9");
	});
});
