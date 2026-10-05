import { describe, expect, it } from "vitest";

import { albumExpiryInfo, canRenewAlbum } from "./album-expiry";

const NOW = 1_000_000;

describe("albumExpiryInfo", () => {
	it("has no countdown without a deadline", () => {
		expect(albumExpiryInfo({}, NOW)).toEqual({ state: "none" });
		expect(
			albumExpiryInfo({ expiresAt: null, viewableUntil: null }, NOW),
		).toEqual({ state: "none" });
	});

	it("counts down to the deadline", () => {
		const info = albumExpiryInfo({ expiresAt: NOW + 2 * 3_600_000 }, NOW);
		expect(info).toMatchObject({ state: "active", label: "2 h" });
	});

	it("falls back to viewableUntil", () => {
		const info = albumExpiryInfo({ viewableUntil: NOW + 600_000 }, NOW);
		expect(info).toMatchObject({ state: "active", label: "10 min" });
	});

	it("is expired once the deadline has passed", () => {
		expect(albumExpiryInfo({ expiresAt: NOW - 1 }, NOW)).toEqual({
			state: "expired",
		});
	});
});

describe("canRenewAlbum", () => {
	it("only the owner can renew an album that has a deadline", () => {
		const active = albumExpiryInfo({ expiresAt: NOW + 1000 }, NOW);
		expect(canRenewAlbum({ info: active, isOwner: true })).toBe(true);
		expect(canRenewAlbum({ info: active, isOwner: false })).toBe(false);
		expect(canRenewAlbum({ info: { state: "none" }, isOwner: true })).toBe(
			false,
		);
	});
});
