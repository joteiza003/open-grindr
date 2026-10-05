const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** "<1 min", "12 min", "1 h 05 min", "3 h". Abreviaturas válidas en es/en/eu. */
export function formatDuration(ms: number): string {
	if (ms < MINUTE_MS) return "<1 min";
	const totalMinutes = Math.round(ms / MINUTE_MS);
	if (totalMinutes < 60) return `${totalMinutes} min`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes === 0
		? `${hours} h`
		: `${hours} h ${String(minutes).padStart(2, "0")} min`;
}

export function formatSeconds(seconds: number): string {
	return formatDuration(seconds * 1000);
}

/** "22:00" para la hora local 22. */
export function formatHour(hour: number): string {
	return `${String(hour).padStart(2, "0")}:00`;
}

export function formatPercent(ratio: number): string {
	return `${Math.round(ratio * 100)} %`;
}

export { HOUR_MS };
