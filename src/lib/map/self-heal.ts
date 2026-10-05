import { trace } from "./map-trace";

const STORAGE_KEY = "map:self-heal-at";
const REASON_KEY = "map:self-heal-reason";
/** Reloading twice in a row would only hide a bug that is still there. */
const MIN_GAP_MS = 120_000;

/**
 * Reloads the page, at most once every couple of minutes.
 *
 * A screen that stopped following its state cannot repair itself: its own
 * reactive layer is the part that is stuck. A reload starts that layer over
 * and costs a couple of seconds. Returns false when it already did so a
 * moment ago (or cannot remember), so the caller can show the diagnostics
 * instead of reloading in a loop.
 */
export function reloadOnce(
	reason: string,
	reload: () => void = () => window.location.reload(),
): boolean {
	try {
		const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
		if (Date.now() - last < MIN_GAP_MS) return false;
		sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
		sessionStorage.setItem(REASON_KEY, reason);
	} catch {
		return false;
	}
	trace(`reloading the screen: ${reason}`);
	reload();
	return true;
}

/**
 * When and why the screen last restarted itself in this session, for the
 * report: the restart wipes the recording, and without this a screen that
 * heals itself would leave no trace that it ever got stuck.
 */
export function lastSelfHeal(): string | null {
	try {
		const at = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
		const reason = sessionStorage.getItem(REASON_KEY);
		if (at === 0 || reason === null) return null;
		return `${Math.round((Date.now() - at) / 1000)} s ago, ${reason}`;
	} catch {
		return null;
	}
}
