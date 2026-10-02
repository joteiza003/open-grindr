import { computeUsageStats, type UsageStats } from "./compute";
import type { UsageEvent } from "./events";

const TEN_YEARS_DAYS = 3650;

export type ConversationStats = UsageStats & {
	/** Primer mensaje registrado de esta conversación. */
	firstAt: number | null;
	/** Si el primer mensaje registrado lo enviaste tú. */
	startedByMe: boolean | null;
};

/** Estadísticas de una sola conversación, con los mensajes que se han registrado. */
export function conversationStats(
	events: readonly UsageEvent[],
	{ conversationId, now }: { conversationId: string; now: number },
): ConversationStats {
	const own = events
		.filter(
			(event) =>
				event.c === conversationId &&
				(event.k === "in" || event.k === "out"),
		)
		.toSorted((a, b) => a.t - b.t);
	const first = own[0];
	return {
		...computeUsageStats(own, { now, days: TEN_YEARS_DAYS }),
		firstAt: first?.t ?? null,
		startedByMe: first ? first.k === "out" : null,
	};
}
