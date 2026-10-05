import type { Action } from "svelte/action";

/** How long a finger must stay down before it counts as a long press. */
const LONG_PRESS_MS = 800;

/** Calls `callback` when the element is pressed and held, without moving off it. */
export const longPress: Action<HTMLElement, () => void> = (node, callback) => {
	let current = callback;
	let timer: ReturnType<typeof setTimeout> | undefined;

	const cancel = () => {
		clearTimeout(timer);
		timer = undefined;
	};
	const start = () => {
		cancel();
		timer = setTimeout(() => {
			timer = undefined;
			current();
		}, LONG_PRESS_MS);
	};
	const endings = ["pointerup", "pointercancel", "pointerleave"] as const;

	node.addEventListener("pointerdown", start);
	for (const type of endings) node.addEventListener(type, cancel);

	return {
		update(next) {
			current = next;
		},
		destroy() {
			cancel();
			node.removeEventListener("pointerdown", start);
			for (const type of endings) node.removeEventListener(type, cancel);
		},
	};
};
