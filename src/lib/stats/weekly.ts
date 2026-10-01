import type { UsageEvent } from "./events";

const DAY_MS = 24 * 60 * 60 * 1000;

export function isMonday(date: Date): boolean {
	return date.getDay() === 1;
}

/** Clave estable del lunes de la semana de `date` (AAAA-MM-DD, hora local). */
export function mondayKey(date: Date): string {
	const monday = new Date(
		date.getFullYear(),
		date.getMonth(),
		date.getDate(),
	);
	const sinceMonday = (monday.getDay() + 6) % 7;
	monday.setDate(monday.getDate() - sinceMonday);
	const month = String(monday.getMonth() + 1).padStart(2, "0");
	const day = String(monday.getDate()).padStart(2, "0");
	return `${monday.getFullYear()}-${month}-${day}`;
}

/**
 * ¿Se enseña el resumen? Solo los lunes, una vez por semana (hasta que se
 * oculta) y si hubo actividad que resumir.
 */
export function shouldShowWeekly({
	now,
	dismissedWeek,
	hasData,
}: {
	now: Date;
	dismissedWeek: string;
	hasData: boolean;
}): boolean {
	return isMonday(now) && hasData && dismissedWeek !== mondayKey(now);
}

/** Conversación a la que más mensajes enviaste en los últimos `days` días. */
export function topConversation(
	events: readonly UsageEvent[],
	{ now, days }: { now: number; days: number },
): { conversationId: string; sent: number } | null {
	const from = now - days * DAY_MS;
	const counts = new Map<string, number>();
	for (const event of events) {
		if (event.k !== "out" || event.t < from || event.t > now) continue;
		if (typeof event.c !== "string") continue;
		counts.set(event.c, (counts.get(event.c) ?? 0) + 1);
	}
	let best: { conversationId: string; sent: number } | null = null;
	for (const [conversationId, sent] of counts) {
		if (best === null || sent > best.sent) best = { conversationId, sent };
	}
	return best;
}
