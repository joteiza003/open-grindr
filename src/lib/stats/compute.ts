import type { UsageEvent } from "./events";

export const STATS_PERIOD_DAYS = [7, 30, 90] as const;
export type StatsPeriodDays = (typeof STATS_PERIOD_DAYS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export type DeckCounts = {
	hide: number;
	skip: number;
	like: number;
	superlike: number;
	favorite: number;
};

export type UsageStats = {
	days: number;
	hasData: boolean;
	sent: number;
	received: number;
	/** Conversaciones cuyo primer mensaje del periodo lo enviaste tú. */
	conversationsStarted: number;
	/** Mensajes entrantes que abrieron un turno (sin respuesta tuya previa). */
	incomingThreads: number;
	/** De esos turnos, cuántos respondiste. */
	repliedThreads: number;
	/** `repliedThreads / incomingThreads`, o null si no hubo ninguno. */
	replyRate: number | null;
	/** Mediana de lo que tardas en responder, en ms, o null sin respuestas. */
	medianReplyMs: number | null;
	sessions: number;
	activeSeconds: number;
	/** Mensajes enviados y recibidos por hora local del día (0–23). */
	hourly: number[];
	/** Hora local con más actividad, o null sin mensajes. */
	busiestHour: number | null;
	deck: DeckCounts;
};

function median(values: number[]): number | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 === 1
		? (sorted[middle] ?? null)
		: ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/** Estadísticas del periodo de `days` días que termina en `now`. */
export function computeUsageStats(
	events: readonly UsageEvent[],
	{ now, days }: { now: number; days: number },
): UsageStats {
	const from = now - days * DAY_MS;
	const inWindow = events
		.filter((event) => event.t >= from && event.t <= now)
		.sort((a, b) => a.t - b.t);

	const stats: UsageStats = {
		days,
		hasData: inWindow.length > 0,
		sent: 0,
		received: 0,
		conversationsStarted: 0,
		incomingThreads: 0,
		repliedThreads: 0,
		replyRate: null,
		medianReplyMs: null,
		sessions: 0,
		activeSeconds: 0,
		hourly: Array.from({ length: 24 }, () => 0),
		busiestHour: null,
		deck: { hide: 0, skip: 0, like: 0, superlike: 0, favorite: 0 },
	};

	const awaitingSince = new Map<string | number, number>();
	const seenConversations = new Set<string | number>();
	const replyDelays: number[] = [];

	for (const event of inWindow) {
		switch (event.k) {
			case "in":
			case "out": {
				const hour = new Date(event.t).getHours();
				stats.hourly[hour] = (stats.hourly[hour] ?? 0) + 1;
				if (event.k === "in") stats.received++;
				else stats.sent++;
				if (event.c === undefined) break;
				if (event.k === "in") {
					seenConversations.add(event.c);
					if (!awaitingSince.has(event.c)) {
						awaitingSince.set(event.c, event.t);
						stats.incomingThreads++;
					}
				} else {
					if (!seenConversations.has(event.c)) {
						seenConversations.add(event.c);
						stats.conversationsStarted++;
					}
					const since = awaitingSince.get(event.c);
					if (since !== undefined) {
						awaitingSince.delete(event.c);
						stats.repliedThreads++;
						replyDelays.push(event.t - since);
					}
				}
				break;
			}
			case "session":
				stats.sessions++;
				stats.activeSeconds += event.d ?? 0;
				break;
			default:
				stats.deck[event.k]++;
		}
	}

	if (stats.incomingThreads > 0) {
		stats.replyRate = stats.repliedThreads / stats.incomingThreads;
	}
	stats.medianReplyMs = median(replyDelays);

	const peak = Math.max(...stats.hourly);
	stats.busiestHour = peak > 0 ? stats.hourly.indexOf(peak) : null;
	return stats;
}
