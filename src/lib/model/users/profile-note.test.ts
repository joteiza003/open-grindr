import { describe, expect, it } from "vitest";

import {
	isEmptyNote,
	mergeProfileNote,
	profileNoteLimits,
} from "./profile-note";

describe("mergeProfileNote", () => {
	it("uses the local note when the profile has no Grindr note", () => {
		expect(
			mergeProfileNote({
				local: { note: "met at the bar", phone: "123" },
				favorite: null,
			}),
		).toEqual({ notes: "met at the bar", phoneNumber: "123" });
	});

	it("prefers the Grindr copy per field and fills gaps from local", () => {
		expect(
			mergeProfileNote({
				local: { note: "old", phone: "999" },
				favorite: { notes: "new", phoneNumber: "" },
			}),
		).toEqual({ notes: "new", phoneNumber: "999" });
	});

	it("is empty when neither side has data", () => {
		expect(mergeProfileNote({ local: {}, favorite: null })).toEqual({
			notes: "",
			phoneNumber: "",
		});
	});
});

describe("profileNoteLimits / isEmptyNote", () => {
	it("caps favorites at Grindr's limit and others at the local one", () => {
		expect(profileNoteLimits({ isFavorite: true }).notes).toBe(250);
		expect(profileNoteLimits({ isFavorite: false }).notes).toBe(2000);
	});

	it("treats whitespace-only as empty", () => {
		expect(isEmptyNote({ notes: "  ", phoneNumber: "" })).toBe(true);
		expect(isEmptyNote({ notes: "x", phoneNumber: "" })).toBe(false);
	});
});
