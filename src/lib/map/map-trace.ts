import { existsAppDataFile } from "$lib/app-data";

/**
 * A short flight recorder for the map screen.
 *
 * The map misbehaved on phones in ways a desktop browser never showed, and
 * there is no debugger on a phone. This keeps the last few hundred events in
 * memory (nothing is stored or sent anywhere) so that a screen that stops
 * answering can be explained afterwards: was the main thread blocked, did
 * storage stop answering, did the taps reach the buttons, and did the screen
 * keep following its own state? Pressing and holding the map title shows the
 * report so it can be copied.
 *
 * Everything here is plain DOM and timers on purpose: it has to keep working
 * when the reactive layer of the screen does not.
 *
 * It records what happened and how long it took, never coordinates or names.
 */

const MAX_ENTRIES = 300;
const HEARTBEAT_MS = 250;
const STALL_MS = 1_000;
const FRAME_STALL_MS = 1_500;
const FRAME_PROBE_EVERY_MS = 1_000;
const LONG_TASK_MS = 500;
const STORAGE_PROBE_EVERY_MS = 5_000;
const STORAGE_SLOW_MS = 1_000;
const PROBED_FILE = "map-elements.json";
const SYNC_CHECK_EVERY_MS = 400;
/** The screen may lag its state a little; this long is a stuck screen. */
const DESYNC_AFTER_MS = 1_500;
/** The screen counts once a second; a stale count this long means it stopped redrawing. */
const BEAT_STALE_AFTER_MS = 3_500;
/** A tap on a button should change something on screen within this long. */
const TAP_EFFECT_MS = 800;
const DEAD_TAPS_WINDOW_MS = 20_000;
const DEAD_TAPS_BEFORE_ALERT = 2;
/** The attribute the map screen writes its heartbeat to; it also marks the screen itself. */
export const HEARTBEAT_ATTRIBUTE = "data-map-heartbeat";

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
		build: __BUILD_ID__,
		// Set by patches/svelte@5.57.0.patch: says whether the build carries it.
		"svelte batch patch": (
			globalThis as { __svelte_batch_patched?: boolean }
		).__svelte_batch_patched
			? "applied"
			: "missing",
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

export type TraceOptions = {
	/**
	 * What the panel area should be showing according to the screen's state.
	 * Compared with the `data-map-panel` attribute actually on screen.
	 */
	expectedPanel?: () => string;
	/**
	 * A counter the screen's state bumps every second. Compared with the
	 * `data-map-heartbeat` attribute on screen: when the screen stops showing
	 * it, the reactive layer stopped redrawing, whatever the user is doing.
	 */
	expectedBeat?: () => number;
	/** Called once when the screen has stopped following its state. */
	onDesync?: (detail: string) => void;
	/** Called when taps on buttons keep changing nothing on screen. */
	onDeadTaps?: () => void;
};

/** What the panel area really shows, as written in the DOM. */
export function panelOnScreen(root: ParentNode): string {
	return (
		root
			.querySelector("[data-map-panel]")
			?.getAttribute("data-map-panel") ?? "missing"
	);
}

/**
 * Starts recording what the screen under `root` does: taps and what they
 * landed on, errors, main-thread stalls, slow storage, frames that stopped
 * and a screen that stopped following its state. Returns the stop function.
 */
export function startTrace(
	root: HTMLElement,
	options: TraceOptions = {},
): () => void {
	trace("map screen opened");
	// Lets tests and a debugger read the report without opening the overlay.
	(window as unknown as { __mapTrace?: () => string }).__mapTrace = () =>
		traceReport();

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
	// Once a second, ask for a frame and see how long it takes to come. A
	// frame loop running all the time would keep the screen awake for nothing.
	let frameRequest = 0;
	let frameWaiting = false;
	const frameProbe = setInterval(() => {
		if (frameWaiting || document.hidden) return;
		frameWaiting = true;
		const asked = performance.now();
		frameRequest = requestAnimationFrame(() => {
			frameWaiting = false;
			const waited = performance.now() - asked;
			if (waited > FRAME_STALL_MS && !document.hidden) {
				trace(`no frame was painted for ${Math.round(waited)} ms`);
			}
		});
	}, FRAME_PROBE_EVERY_MS);
	const onVisibility = () => {
		last = performance.now();
	};
	document.addEventListener("visibilitychange", onVisibility);

	let longTasks: PerformanceObserver | undefined;
	try {
		longTasks = new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				if (entry.duration >= LONG_TASK_MS) {
					trace(`long task: ${Math.round(entry.duration)} ms`);
				}
			}
		});
		longTasks.observe({ type: "longtask" });
	} catch {
		longTasks = undefined;
	}

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

	// Does the screen keep following its own state?
	let mismatchSince = 0;
	let reported = "";
	let beatBehindSince = 0;
	let beatReported = "";
	const syncCheck = setInterval(() => {
		if (document.hidden) return;
		const now = performance.now();

		const expected = options.expectedPanel?.();
		if (expected !== undefined) {
			const actual = panelOnScreen(root);
			if (expected === actual) {
				mismatchSince = 0;
				reported = "";
			} else {
				mismatchSince ||= now;
				const detail = `state says "${expected}", screen shows "${actual}"`;
				if (
					now - mismatchSince >= DESYNC_AFTER_MS &&
					reported !== detail
				) {
					reported = detail;
					trace(`the screen stopped following its state: ${detail}`);
					options.onDesync?.(detail);
				}
			}
		}

		const beat = options.expectedBeat?.();
		if (beat !== undefined) {
			const shown = root.getAttribute(HEARTBEAT_ATTRIBUTE) ?? "missing";
			if (shown === String(beat)) {
				beatBehindSince = 0;
				beatReported = "";
			} else {
				beatBehindSince ||= now;
				const detail = `the state is at heartbeat ${beat}, the screen shows ${shown}`;
				if (
					now - beatBehindSince >= BEAT_STALE_AFTER_MS &&
					beatReported !== shown
				) {
					beatReported = shown;
					trace(`the screen stopped redrawing: ${detail}`);
					options.onDesync?.(detail);
				}
			}
		}
	}, SYNC_CHECK_EVERY_MS);

	// Does a tap on a button change anything on screen?
	let lastMutation = Number.NEGATIVE_INFINITY;
	const mutations = new MutationObserver((records) => {
		// The heartbeat changes every second whatever the user does, so it says
		// nothing about whether a tap had an effect.
		const onlyHeartbeat = records.every(
			(record) =>
				record.type === "attributes" &&
				record.attributeName === HEARTBEAT_ATTRIBUTE,
		);
		if (!onlyHeartbeat) lastMutation = performance.now();
	});
	mutations.observe(root, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	});
	let deadTaps: number[] = [];

	const onPointerDown = (event: PointerEvent) => {
		const target = event.target instanceof Element ? event.target : null;
		trace(
			`touch on ${describe(target)}, topmost there: ${topmostAt(event.clientX, event.clientY)}`,
		);
	};
	const onClick = (event: MouseEvent) => {
		const target = event.target instanceof Element ? event.target : null;
		trace(`click on ${describe(target)}`);
		const button = target?.closest("button");
		if (
			!button ||
			!root.contains(button) ||
			button.disabled ||
			button.hasAttribute("data-no-dom-change")
		) {
			return;
		}
		const tappedAt = performance.now();
		const path = window.location.pathname;
		setTimeout(() => {
			if (lastMutation >= tappedAt || window.location.pathname !== path) {
				deadTaps = [];
				return;
			}
			trace(`tap on ${describe(button)} changed nothing on screen`);
			const now = performance.now();
			deadTaps = [...deadTaps, now].filter(
				(at) => now - at < DEAD_TAPS_WINDOW_MS,
			);
			if (deadTaps.length >= DEAD_TAPS_BEFORE_ALERT) {
				deadTaps = [];
				options.onDeadTaps?.();
			}
		}, TAP_EFFECT_MS);
	};
	const onError = (event: ErrorEvent) => trace(`error: ${event.message}`);
	const onRejection = (event: PromiseRejectionEvent) =>
		trace(`unhandled rejection: ${String(event.reason).slice(0, 120)}`);

	// On the window and in the capture phase: the first place an event passes,
	// so nothing further down the page can hide a tap from the record by
	// stopping it, and a tap that lands on something outside the screen (a
	// leftover overlay, say) shows up too.
	window.addEventListener("pointerdown", onPointerDown, true);
	window.addEventListener("click", onClick, true);
	window.addEventListener("error", onError);
	window.addEventListener("unhandledrejection", onRejection);

	return () => {
		clearInterval(heartbeat);
		clearInterval(probe);
		clearInterval(syncCheck);
		clearInterval(frameProbe);
		cancelAnimationFrame(frameRequest);
		longTasks?.disconnect();
		mutations.disconnect();
		document.removeEventListener("visibilitychange", onVisibility);
		window.removeEventListener("pointerdown", onPointerDown, true);
		window.removeEventListener("click", onClick, true);
		window.removeEventListener("error", onError);
		window.removeEventListener("unhandledrejection", onRejection);
		delete (window as unknown as { __mapTrace?: () => string }).__mapTrace;
		trace("map screen closed");
	};
}
