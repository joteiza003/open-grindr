import z from "zod";

/**
 * Tipos de evento del registro local de uso:
 * - `in` / `out`: mensaje recibido / enviado (`c` = id de conversación).
 * - `hide` / `skip` / `like` / `superlike` / `favorite`: decisiones del
 *   carrusel (`c` = id de perfil).
 * - `session`: tiempo con la app en primer plano (`t` = inicio, `d` = segundos).
 */
export const EVENT_KINDS = [
	"in",
	"out",
	"hide",
	"skip",
	"like",
	"superlike",
	"favorite",
	"session",
] as const;

export type UsageEventKind = (typeof EVENT_KINDS)[number];

export const usageEventSchema = z.object({
	t: z.number().int().nonnegative(),
	k: z.enum(EVENT_KINDS),
	c: z.union([z.string(), z.number()]).optional(),
	d: z.number().int().nonnegative().optional(),
});

export type UsageEvent = z.infer<typeof usageEventSchema>;

export const usageEventsFileSchema = z.object({
	version: z.literal(1),
	events: z.array(z.unknown()),
});

/** Tope del registro: al superarlo se descartan los eventos más antiguos. */
export const MAX_USAGE_EVENTS = 20_000;

/** Lee el fichero guardado; ignora entradas corruptas en vez de perderlo todo. */
export function parseUsageEventsFile(raw: unknown): UsageEvent[] {
	const file = usageEventsFileSchema.safeParse(raw);
	if (!file.success) return [];
	const events: UsageEvent[] = [];
	for (const entry of file.data.events) {
		const parsed = usageEventSchema.safeParse(entry);
		if (parsed.success) events.push(parsed.data);
	}
	return events;
}

/** Añade eventos al final y recorta a los últimos `max`. */
export function appendUsageEvents(
	events: readonly UsageEvent[],
	added: readonly UsageEvent[],
	max = MAX_USAGE_EVENTS,
): UsageEvent[] {
	const next = [...events, ...added];
	return next.length > max ? next.slice(next.length - max) : next;
}
