import {
	preferencesSnapshot,
	setPreferences,
} from "$lib/app-data/preferences.svelte";
import {
	activeHiddenIds,
	addSilence,
	findSilence,
	removeSilence,
	type SilenceEntry,
	type SilenceKind,
	splitExpired,
} from "./temporary-silence";

/** Cada cambio parte de las preferencias que dejó el anterior. */
let queue: Promise<unknown> = Promise.resolve();

function update(
	change: (entries: readonly SilenceEntry[]) => SilenceEntry[],
): Promise<void> {
	const run = queue.then(() =>
		setPreferences({ temporarySilences: change(silenceEntries()) }),
	);
	queue = run.catch(() => undefined);
	return run;
}

export function silenceEntries(): readonly SilenceEntry[] {
	// Los tests de otras pantallas simulan las preferencias a medias.
	return preferencesSnapshot().temporarySilences ?? [];
}

/** Perfiles que ahora mismo están ocultos por un silencio temporal. */
export function temporarilyHiddenIds(now = Date.now()): Set<number> {
	return activeHiddenIds(silenceEntries(), now);
}

export function activeSilence({
	profileId,
	kind,
	now = Date.now(),
}: {
	profileId: number;
	kind: SilenceKind;
	now?: number;
}): SilenceEntry | null {
	return findSilence(silenceEntries(), { profileId, kind }, now);
}

export function startSilence(entry: SilenceEntry): Promise<void> {
	return update((entries) => addSilence(entries, entry));
}

export function endSilence(target: {
	profileId: number;
	kind: SilenceKind;
}): Promise<void> {
	return update((entries) => removeSilence(entries, target));
}

/**
 * Cierra los silencios que ya terminaron. Los de tipo `mute` reactivan antes
 * la conversación; si eso falla se conservan para reintentar más tarde.
 */
export async function sweepSilences({
	now = Date.now(),
	unmute,
}: {
	now?: number;
	unmute: (conversationId: string) => Promise<void>;
}): Promise<void> {
	const { expired } = splitExpired(silenceEntries(), now);
	if (expired.length === 0) return;
	const done: SilenceEntry[] = [];
	for (const entry of expired) {
		if (entry.kind === "mute" && entry.conversationId !== undefined) {
			try {
				await unmute(entry.conversationId);
			} catch (error) {
				console.error("[silence] Failed to unmute", error);
				continue;
			}
		}
		done.push(entry);
	}
	if (done.length === 0) return;
	await update((entries) =>
		entries.filter(
			(entry) =>
				!done.some(
					(finished) =>
						finished.profileId === entry.profileId &&
						finished.kind === entry.kind &&
						finished.until === entry.until,
				),
		),
	);
}

const SWEEP_EVERY_MS = 60_000;

/** Revisa al abrir y cada minuto (solo con la app abierta). */
export function startSilenceSweeper({
	unmute,
}: {
	unmute: (conversationId: string) => Promise<void>;
}): () => void {
	const run = () =>
		void sweepSilences({ unmute }).catch((error: unknown) => {
			console.error("[silence] sweep failed", error);
		});
	run();
	const timer = setInterval(run, SWEEP_EVERY_MS);
	return () => clearInterval(timer);
}
