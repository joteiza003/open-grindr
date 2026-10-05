import { goto } from "$app/navigation";

import { canGoBack } from "$lib/util/history";
import { HEARTBEAT_ATTRIBUTE, trace } from "./map-trace";

/** How long a history step may take before we navigate home ourselves. */
const HISTORY_STEP_GRACE_MS = 250;
/** How long the map may stay on screen after leaving was asked for. */
const SCREEN_GRACE_MS = 1_500;

const onMapPath = () => window.location.pathname.startsWith("/map");
/**
 * The address can already say the map is gone while the screen still shows
 * it, when the router is stuck: the heartbeat attribute marks the screen.
 */
const mapOnScreen = () =>
	document.querySelector(`[${HEARTBEAT_ATTRIBUTE}]`) !== null;

/**
 * Builds the function that leaves the map: one step back in history, then the
 * home screen if that step goes nowhere, then a fresh page load if the map is
 * still there after all that. `loadPage` is what loads a page afresh
 * (injectable for tests).
 */
export function createLeaveMap({
	loadPage = (url: string) => window.location.assign(url),
}: { loadPage?: (url: string) => void } = {}): () => void {
	function loadHome(): void {
		trace("loading the home screen afresh");
		loadPage("/");
	}

	function goHome(): void {
		trace("going to the home screen");
		try {
			void Promise.resolve(goto("/", { replaceState: true })).catch(
				loadHome,
			);
		} catch {
			loadHome();
		}
	}

	return function leaveMap(): void {
		// Last resort, whatever the router does: leaving the map must work even
		// when the router is stuck or its navigation waits on something that
		// never answers.
		window.setTimeout(() => {
			if (onMapPath() || mapOnScreen()) loadHome();
		}, SCREEN_GRACE_MS);

		try {
			if (!canGoBack()) return goHome();
			trace("leaving the map: one step back");
			history.back();
			window.setTimeout(() => {
				if (onMapPath()) {
					trace("the step back did not leave the map");
					goHome();
				}
			}, HISTORY_STEP_GRACE_MS);
		} catch {
			goHome();
		}
	};
}

export const leaveMap = createLeaveMap();
