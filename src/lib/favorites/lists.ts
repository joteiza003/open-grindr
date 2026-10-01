import z from "zod";

import type { MessageKey } from "$lib/i18n/en";

export const MAX_FAVORITE_LISTS = 20;
export const MAX_PROFILES_PER_LIST = 500;
export const MAX_LIST_NAME = 30;

export const favoriteListSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(MAX_LIST_NAME),
	profileIds: z
		.array(z.int().positive())
		.max(MAX_PROFILES_PER_LIST)
		.default([]),
});

export type FavoriteList = z.infer<typeof favoriteListSchema>;

export type ListProblem = "empty-name" | "duplicate-name" | "too-many-lists";

/** Texto que explica cada problema al crear o renombrar una lista. */
export function listProblemKey(problem: ListProblem): MessageKey {
	switch (problem) {
		case "empty-name":
			return "lists.problem.emptyName";
		case "duplicate-name":
			return "lists.problem.duplicate";
		case "too-many-lists":
			return "lists.problem.tooMany";
	}
}

type Outcome =
	| { ok: true; lists: FavoriteList[] }
	| { ok: false; problem: ListProblem };

function nameProblem(
	lists: readonly FavoriteList[],
	name: string,
	exceptId?: string,
): ListProblem | null {
	const trimmed = name.trim();
	if (trimmed === "") return "empty-name";
	const clash = lists.some(
		(list) =>
			list.id !== exceptId &&
			list.name.toLowerCase() === trimmed.toLowerCase(),
	);
	return clash ? "duplicate-name" : null;
}

export function createList(
	lists: readonly FavoriteList[],
	{ id, name }: { id: string; name: string },
): Outcome {
	if (lists.length >= MAX_FAVORITE_LISTS) {
		return { ok: false, problem: "too-many-lists" };
	}
	const problem = nameProblem(lists, name);
	if (problem) return { ok: false, problem };
	return {
		ok: true,
		lists: [
			...lists,
			{ id, name: name.trim().slice(0, MAX_LIST_NAME), profileIds: [] },
		],
	};
}

export function renameList(
	lists: readonly FavoriteList[],
	{ id, name }: { id: string; name: string },
): Outcome {
	const problem = nameProblem(lists, name, id);
	if (problem) return { ok: false, problem };
	return {
		ok: true,
		lists: lists.map((list) =>
			list.id === id
				? { ...list, name: name.trim().slice(0, MAX_LIST_NAME) }
				: list,
		),
	};
}

export function deleteList(
	lists: readonly FavoriteList[],
	id: string,
): FavoriteList[] {
	return lists.filter((list) => list.id !== id);
}

/** Añade o quita un perfil de una lista; al llenarse la lista no admite más. */
export function setMembership(
	lists: readonly FavoriteList[],
	{
		listId,
		profileId,
		member,
	}: { listId: string; profileId: number; member: boolean },
): FavoriteList[] {
	return lists.map((list) => {
		if (list.id !== listId) return list;
		const has = list.profileIds.includes(profileId);
		if (member && !has) {
			return list.profileIds.length >= MAX_PROFILES_PER_LIST
				? list
				: { ...list, profileIds: [...list.profileIds, profileId] };
		}
		if (!member && has) {
			return {
				...list,
				profileIds: list.profileIds.filter((id) => id !== profileId),
			};
		}
		return list;
	});
}

/** Listas a las que pertenece un perfil. */
export function listsOf(
	lists: readonly FavoriteList[],
	profileId: number,
): FavoriteList[] {
	return lists.filter((list) => list.profileIds.includes(profileId));
}

/** Ids que entran en el filtro de una lista, o `null` si no hay filtro. */
export function memberIds(
	lists: readonly FavoriteList[],
	listId: string | null,
): ReadonlySet<number> | null {
	if (listId === null) return null;
	const list = lists.find((entry) => entry.id === listId);
	return new Set(list?.profileIds ?? []);
}
