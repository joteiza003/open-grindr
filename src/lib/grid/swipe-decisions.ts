import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import { appendDecision } from "./swipe-list";

type BrowseDecisions = {
	rejectedProfileIds?: number[];
	acceptedProfileIds?: number[];
};

function decisions(): BrowseDecisions {
	// Los tests de otras pantallas simulan las preferencias a medias.
	return (preferencesSnapshot() as { browse?: BrowseDecisions }).browse ?? {};
}

export function rejectedProfileIds(): ReadonlySet<number> {
	return new Set(decisions().rejectedProfileIds ?? []);
}

export function acceptedProfileIds(): ReadonlySet<number> {
	return new Set(decisions().acceptedProfileIds ?? []);
}

export function decidedProfileIds(): ReadonlySet<number> {
	return new Set([...rejectedProfileIds(), ...acceptedProfileIds()]);
}

// Cada cambio lee la instantánea ya publicada por el anterior: dos deslizados
// seguidos no se pisan.
let queue: Promise<unknown> = Promise.resolve();

function update(
	change: (
		browse: ReturnType<typeof preferencesSnapshot>["browse"],
	) => Partial<ReturnType<typeof preferencesSnapshot>["browse"]>,
): Promise<void> {
	const run = queue.then(async () => {
		const browse = preferencesSnapshot().browse;
		await setPreferences({ browse: { ...browse, ...change(browse) } });
	});
	queue = run.catch(() => undefined);
	return run;
}

export function rejectProfile(id: number): Promise<void> {
	return update((browse) => ({
		rejectedProfileIds: appendDecision(browse.rejectedProfileIds, id),
		acceptedProfileIds: browse.acceptedProfileIds.filter((x) => x !== id),
	}));
}

export function acceptProfile(id: number): Promise<void> {
	return update((browse) => ({
		acceptedProfileIds: appendDecision(browse.acceptedProfileIds, id),
		rejectedProfileIds: browse.rejectedProfileIds.filter((x) => x !== id),
	}));
}

/** Deshace un "ocultar": el perfil vuelve a la baraja y a la rejilla. */
export function unrejectProfile(id: number): Promise<void> {
	return update((browse) => ({
		rejectedProfileIds: browse.rejectedProfileIds.filter((x) => x !== id),
	}));
}

/** Deshace un "me gusta": el perfil vuelve a la baraja. */
export function unacceptProfile(id: number): Promise<void> {
	return update((browse) => ({
		acceptedProfileIds: browse.acceptedProfileIds.filter((x) => x !== id),
	}));
}

/** Vuelve a mostrar todos los perfiles descartados y rehabilita la baraja. */
export function resetDecisions(): Promise<void> {
	return update(() => ({ rejectedProfileIds: [], acceptedProfileIds: [] }));
}
