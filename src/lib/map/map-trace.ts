import { existsAppDataFile } from "$lib/app-data";

/**
 * A short flight recorder for the map screen.
 *
 * The map misbehaved on phones in ways a desktop browser never showed, and
 * there is no debugger on a phone. This keeps the last few hundred events in
 * memory (nothing is stored or sent anywhere) so that a screen that stops
 * answering can be explained afterwards: was the main thread blocked, did
 * storage stop answering, or did the taps never reach the buttons? Pressing
 * and holding the map title shows the report so it can be copied.
 *
 * It records what happened and how long it took, never coordinates or names.
 */

const MAX_ENTRIES = 300;
const HEARTBEAT_MS = 250;
const STALL_MS = 1_000;
const STORAGE_PROBE_EVERY_MS = 5_000;
const STORAGE_SLOW_MS = 1_000;
const PROBED_FILE = "map-elements.json";

type Entry = { at: number; text: string };

const entries: Entry[] = [];

export function trace(text: string): void {
	entries.push({ at: performance.now(), text });
	if (entries.length > MAX_ENTRIES) entries.shift();
}

export function clearTrace(): void {
	entries.length = 0;
}

/** What is topmost at a point; recording must never throw. */
function topmostAt(x: number, y: number): string {
	try {
		return describe(document.elementFromPoint(x, y));
	} catch {
		return "unknown";
	}
}

function describe(element: Element | null): string {
	if (element === null) return "nothing";
	const label =
		element.getAttribute("aria-label") ??
		element.getAttribute("title") ??
		"";
	const classes = (element.getAttribute("class") ?? "")
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.join(".");
	const name = label ? `[${label.slice(0, 24)}]` : "";
	return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ""}${name}`;
}

/** Everything recorded so far, with the facts about the device that matter. */
export function traceReport(
	extra: Record<string, string | number> = {},
): string {
	const first = entries[0]?.at ?? 0;
	const facts: Record<string, string | number> = {
		cores: navigator.hardwareConcurrency,
		pixelRatio: window.devicePixelRatio,
		viewport: `${window.innerWidth}x${window.innerHeight}`,
		"body pointer-events": getComputedStyle(document.body).pointerEvents,
		...extra,
	};
	return [
		...Object.entries(facts).map(([name, value]) => `${name}: ${value}`),
		navigator.userAgent,
		"",
		...entries.map(
			({ at, text }) =>
				`+${((at - first) / 1000).toFixed(1).padStart(6)}s ${text}`,
		),
	].join("\n");
}

/**
 * Starts recording what the screen under `root` does: taps and what they
 * landed on, errors, main-thread stalls and slow storage. Returns the stop
 * function.
 */
export function startTrace(root: HTMLElement): () => void {
	trace("map screen opened");

	let last = performance.now();
	const heartbeat = setInterval(() => {
		const now = performance.now();
		const late = now - last - HEARTBEAT_MS;
		last = now;
		// A backgrounded app is not a stall.
		if (late > STALL_MS && !document.hidden) {
			trace(`main thread was blocked for ${Math.round(late)} ms`);
		}
	}, HEARTBEAT_MS);
	const onVisibility = () => {
		last = performance.now();
	};
	document.addEventListener("visibilitychange", onVisibility);

	let probing = false;
	const probe = setInterval(() => {
		if (probing || document.hidden) return;
		probing = true;
		const began = performance.now();
		const watchdog = setTimeout(
			() => trace(`storage has not answered for ${STORAGE_SLOW_MS} ms`),
			STORAGE_SLOW_MS,
		);
		void existsAppDataFile(PROBED_FILE)
			.catch(() => false)
			.finally(() => {
				clearTimeout(watchdog);
				const took = Math.round(performance.now() - began);
				if (took > STORAGE_SLOW_MS)
					trace(`storage answered after ${took} ms`);
				probing = false;
			});
	}, STORAGE_PROBE_EVERY_MS);

	const onPointerDown = (event: PointerEvent) => {
		const target = event.target instanceof Element ? event.target : null;
		trace(
			`touch on ${describe(target)}, topmost there: ${topmostAt(event.clientX, event.clientY)}`,
		);
	};
	const onClick = (event: MouseEvent) => {
		const target = event.target instanceof Element ? event.target : null;
		trace(`click on ${describe(target)}`);
	};
	const onError = (event: ErrorEvent) => trace(`error: ${event.message}`);
	const onRejection = (event: PromiseRejectionEvent) =>
		trace(`unhandled rejection: ${String(event.reason).slice(0, 120)}`);

	root.addEventListener("pointerdown", onPointerDown, true);
	root.addEventListener("click", onClick, true);
	window.addEventListener("error", onError);
	window.addEventListener("unhandledrejection", onRejection);

	return () => {
		clearInterval(heartbeat);
		clearInterval(probe);
		document.removeEventListener("visibilitychange", onVisibility);
		root.removeEventListener("pointerdown", onPointerDown, true);
		root.removeEventListener("click", onClick, true);
		window.removeEventListener("error", onError);
		window.removeEventListener("unhandledrejection", onRejection);
		trace("map screen closed");
	};
}
