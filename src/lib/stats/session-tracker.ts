import { type UsageEventLog, usageEvents } from "./event-log";

/** Sesiones más cortas que esto no cuentan (cambios de pestaña, parpadeos). */
export const MIN_SESSION_SECONDS = 5;

/**
 * Registra el tiempo con la app en primer plano: abre una sesión al mostrarse
 * y la cierra al pasar a segundo plano o al cerrar la ventana.
 */
export function startSessionTracking({
	log = usageEvents,
	now = Date.now,
}: { log?: UsageEventLog; now?: () => number } = {}): () => void {
	if (typeof document === "undefined") return () => undefined;

	let startedAt: number | null = document.hidden ? null : now();

	const close = () => {
		if (startedAt === null) return;
		const seconds = Math.round((now() - startedAt) / 1000);
		if (seconds >= MIN_SESSION_SECONDS) {
			log.record({ k: "session", t: startedAt, d: seconds });
		}
		startedAt = null;
		void log.flush();
	};

	const onVisibility = () => {
		if (document.hidden) close();
		else startedAt ??= now();
	};

	document.addEventListener("visibilitychange", onVisibility);
	window.addEventListener("pagehide", close);
	return () => {
		document.removeEventListener("visibilitychange", onVisibility);
		window.removeEventListener("pagehide", close);
		close();
	};
}
