import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import {
	createList,
	deleteList,
	type FavoriteList,
	type ListProblem,
	memberIds,
	renameList,
	setMembership,
} from "./lists";

/** Cada cambio parte de las preferencias que dejó el anterior. */
let queue: Promise<unknown> = Promise.resolve();

function update(
	change: (lists: readonly FavoriteList[]) => FavoriteList[],
): Promise<void> {
	const run = queue.then(() =>
		setPreferences({ favoriteLists: change(favoriteLists()) }),
	);
	queue = run.catch(() => undefined);
	return run;
}

export function favoriteLists(): readonly FavoriteList[] {
	// Los tests de otras pantallas simulan las preferencias a medias.
	return preferencesSnapshot().favoriteLists ?? [];
}

type Result = { ok: true } | { ok: false; problem: ListProblem };

async function run(
	build: (
		lists: readonly FavoriteList[],
	) =>
		| { ok: true; lists: FavoriteList[] }
		| { ok: false; problem: ListProblem },
): Promise<Result> {
	let problem: ListProblem | null = null;
	await update((lists) => {
		const result = build(lists);
		if (result.ok) return result.lists;
		problem = result.problem;
		return [...lists];
	});
	return problem === null ? { ok: true } : { ok: false, problem };
}

export function addList(name: string): Promise<Result> {
	return run((lists) => createList(lists, { id: crypto.randomUUID(), name }));
}

export function renameFavoriteList(id: string, name: string): Promise<Result> {
	return run((lists) => renameList(lists, { id, name }));
}

export function removeFavoriteList(id: string): Promise<void> {
	if (filter.activeId === id) filter.activeId = null;
	return update((lists) => deleteList(lists, id));
}

export function setListMember(args: {
	listId: string;
	profileId: number;
	member: boolean;
}): Promise<void> {
	return update((lists) => setMembership(lists, args));
}

/** Lista elegida como filtro en la cuadrícula y el buzón (solo en memoria). */
class FavoriteListFilter {
	activeId = $state<string | null>(null);

	/** Ids permitidos por el filtro, o `null` si no hay filtro activo. */
	allowedIds(): ReadonlySet<number> | null {
		return memberIds(favoriteLists(), this.activeId);
	}
}

export const filter = new FavoriteListFilter();
