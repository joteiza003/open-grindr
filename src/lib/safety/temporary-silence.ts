import z from "zod";

const HOUR_MS = 60 * 60 * 1000;

/** Duraciones que se ofrecen, de la más corta a la más larga. */
export const SILENCE_DURATIONS = [
	{ id: "1h", ms: HOUR_MS },
	{ id: "8h", ms: 8 * HOUR_MS },
	{ id: "24h", ms: 24 * HOUR_MS },
	{ id: "7d", ms: 7 * 24 * HOUR_MS },
] as const;

export type SilenceDurationId = (typeof SILENCE_DURATIONS)[number]["id"];

/** Cuántos silencios temporales se recuerdan a la vez. */
export const MAX_SILENCES = 200;

export const silenceKindSchema = z.enum(["mute", "hide"]);
export type SilenceKind = z.infer<typeof silenceKindSchema>;

export const silenceEntrySchema = z.object({
	profileId: z.int().positive(),
	kind: silenceKindSchema,
	/** Instante (ms) en que termina el silencio. */
	until: z.number().int().nonnegative(),
	/** Para `mute`: conversación que se silenció y que se reactiva al terminar. */
	conversationId: z.string().min(1).optional(),
});

export type SilenceEntry = z.infer<typeof silenceEntrySchema>;

export function durationMs(id: SilenceDurationId): number {
	return (
		SILENCE_DURATIONS.find((duration) => duration.id === id)?.ms ?? HOUR_MS
	);
}

/**
 * Añade o renueva un silencio. Hay uno por perfil y tipo; si se supera el tope
 * se descartan los que terminan antes.
 */
export function addSilence(
	entries: readonly SilenceEntry[],
	entry: SilenceEntry,
	max = MAX_SILENCES,
): SilenceEntry[] {
	const next = [
		...entries.filter(
			(other) =>
				!(
					other.profileId === entry.profileId &&
					other.kind === entry.kind
				),
		),
		entry,
	];
	if (next.length <= max) return next;
	return next.toSorted((a, b) => b.until - a.until).slice(0, max);
}

export function removeSilence(
	entries: readonly SilenceEntry[],
	{ profileId, kind }: { profileId: number; kind: SilenceKind },
): SilenceEntry[] {
	return entries.filter(
		(entry) => !(entry.profileId === profileId && entry.kind === kind),
	);
}

export function isSilenceActive(entry: SilenceEntry, now: number): boolean {
	return entry.until > now;
}

export function findSilence(
	entries: readonly SilenceEntry[],
	{ profileId, kind }: { profileId: number; kind: SilenceKind },
	now: number,
): SilenceEntry | null {
	return (
		entries.find(
			(entry) =>
				entry.profileId === profileId &&
				entry.kind === kind &&
				isSilenceActive(entry, now),
		) ?? null
	);
}

/** Perfiles ocultos ahora mismo por un silencio temporal. */
export function activeHiddenIds(
	entries: readonly SilenceEntry[],
	now: number,
): Set<number> {
	return new Set(
		entries
			.filter(
				(entry) => entry.kind === "hide" && isSilenceActive(entry, now),
			)
			.map((entry) => entry.profileId),
	);
}

/** Separa los silencios vigentes de los que ya terminaron. */
export function splitExpired(
	entries: readonly SilenceEntry[],
	now: number,
): { active: SilenceEntry[]; expired: SilenceEntry[] } {
	const active: SilenceEntry[] = [];
	const expired: SilenceEntry[] = [];
	for (const entry of entries) {
		(isSilenceActive(entry, now) ? active : expired).push(entry);
	}
	return { active, expired };
}
