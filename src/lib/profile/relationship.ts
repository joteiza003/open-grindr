import type { UsageEvent, UsageEventKind } from "$lib/stats/events";

export type DeckDecisionKind = Extract<
	UsageEventKind,
	"like" | "superlike" | "favorite" | "hide" | "skip"
>;

export type RelationshipSummary = {
	messagesOut: number;
	messagesIn: number;
	firstAt: number | null;
	lastAt: number | null;
	startedByMe: boolean | null;
	decision: { kind: DeckDecisionKind; at: number } | null;
};

const DECISIONS: readonly string[] = [
	"like",
	"superlike",
	"favorite",
	"hide",
	"skip",
];

/** Resumen con una persona a partir del registro local de uso. */
export function relationshipSummary(
	events: readonly UsageEvent[],
	{
		conversationId,
		profileId,
	}: { conversationId: string; profileId: number },
): RelationshipSummary {
	const messages = events
		.filter(
			(event) =>
				event.c === conversationId &&
				(event.k === "in" || event.k === "out"),
		)
		.toSorted((a, b) => a.t - b.t);
	const decisions = events
		.filter((event) => event.c === profileId && DECISIONS.includes(event.k))
		.toSorted((a, b) => b.t - a.t);
	const first = messages[0];
	const last = messages.at(-1);
	const latest = decisions[0];
	return {
		messagesOut: messages.filter((event) => event.k === "out").length,
		messagesIn: messages.filter((event) => event.k === "in").length,
		firstAt: first?.t ?? null,
		lastAt: last?.t ?? null,
		startedByMe: first ? first.k === "out" : null,
		decision: latest
			? { kind: latest.k as DeckDecisionKind, at: latest.t }
			: null,
	};
}

export function hasRelationship(summary: RelationshipSummary): boolean {
	return (
		summary.messagesIn + summary.messagesOut > 0 ||
		summary.decision !== null
	);
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 3600_000],
	["month", 30 * 24 * 3600_000],
	["week", 7 * 24 * 3600_000],
	["day", 24 * 3600_000],
	["hour", 3600_000],
	["minute", 60_000],
];

/** «hace 3 días», en el idioma de la app. */
export function relativeTime(at: number, now: number, locale?: string): string {
	const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
	const diff = at - now;
	for (const [unit, size] of UNITS) {
		if (Math.abs(diff) >= size) {
			return formatter.format(Math.round(diff / size), unit);
		}
	}
	return formatter.format(0, "minute");
}
