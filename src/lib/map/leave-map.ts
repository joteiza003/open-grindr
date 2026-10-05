import { goto } from "$app/navigation";

import { canGoBack } from "$lib/util/history";
import { trace } from "./map-trace";

/** How long a history step may take before we navigate home ourselves. */
const HISTORY_STEP_GRACE_MS = 250;

function goHome(): void {
	trace("going to the home screen");
	const failed = () => window.location.assign("/");
	try {
		void Promise.resolve(goto("/", { replaceState: true })).catch(failed);
	} catch {
		failed();
	}
}

/**
 * Leaves the map: one step back in history, and straight to the home screen
 * if that step goes nowhere (no history, or the navigation never happened).
 */
export function leaveMap(): void {
	try {
		if (!canGoBack()) return goHome();
		trace("leaving the map: one step back");
		history.back();
		window.setTimeout(() => {
			if (window.location.pathname.startsWith("/map")) {
				trace("the step back did not leave the map");
				goHome();
			}
		}, HISTORY_STEP_GRACE_MS);
	} catch {
		goHome();
	}
}
