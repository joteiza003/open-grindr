import { describe, expect, it } from "vitest";

import {
	createList,
	deleteList,
	type FavoriteList,
	listsOf,
	MAX_FAVORITE_LISTS,
	memberIds,
	renameList,
	setMembership,
} from "./lists";

const list = (
	id: string,
	name: string,
	profileIds: number[] = [],
): FavoriteList => ({ id, name, profileIds });

describe("createList", () => {
	it("adds a trimmed list", () => {
		const result = createList([], { id: "a", name: "  Amigos " });
		expect(result).toEqual({ ok: true, lists: [list("a", "Amigos")] });
	});

	it("rejects empty and repeated names and a full set of lists", () => {
		expect(createList([], { id: "a", name: "  " })).toEqual({
			ok: false,
			problem: "empty-name",
		});
		expect(
			createList([list("a", "Amigos")], { id: "b", name: "amigos" }),
		).toEqual({ ok: false, problem: "duplicate-name" });
		const full = Array.from({ length: MAX_FAVORITE_LISTS }, (_, i) =>
			list(`l${i}`, `L${i}`),
		);
		expect(createList(full, { id: "x", name: "Otra" })).toEqual({
			ok: false,
			problem: "too-many-lists",
		});
	});
});

describe("renameList", () => {
	it("renames, allowing the same name with different case on itself", () => {
		const lists = [list("a", "Amigos"), list("b", "Citas")];
		expect(renameList(lists, { id: "a", name: "AMIGOS" })).toMatchObject({
			ok: true,
		});
		expect(renameList(lists, { id: "a", name: "citas" })).toEqual({
			ok: false,
			problem: "duplicate-name",
		});
		const renamed = renameList(lists, { id: "a", name: "Colegas" });
		expect(renamed.ok && renamed.lists[0]?.name).toBe("Colegas");
	});
});

describe("deleteList / setMembership / listsOf / memberIds", () => {
	const lists = [list("a", "Amigos", [1, 2]), list("b", "Citas", [2])];

	it("deletes a list", () => {
		expect(deleteList(lists, "a").map((l) => l.id)).toEqual(["b"]);
	});

	it("adds and removes members without repeats", () => {
		const added = setMembership(lists, {
			listId: "b",
			profileId: 5,
			member: true,
		});
		expect(added[1]?.profileIds).toEqual([2, 5]);
		const again = setMembership(added, {
			listId: "b",
			profileId: 5,
			member: true,
		});
		expect(again[1]?.profileIds).toEqual([2, 5]);
		const removed = setMembership(again, {
			listId: "a",
			profileId: 1,
			member: false,
		});
		expect(removed[0]?.profileIds).toEqual([2]);
	});

	it("finds the lists of a profile and the ids to filter by", () => {
		expect(listsOf(lists, 2).map((l) => l.id)).toEqual(["a", "b"]);
		expect([...(memberIds(lists, "a") ?? [])]).toEqual([1, 2]);
		expect(memberIds(lists, null)).toBeNull();
		expect([...(memberIds(lists, "zzz") ?? [])]).toEqual([]);
	});
});
