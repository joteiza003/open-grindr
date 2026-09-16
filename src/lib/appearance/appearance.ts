import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";
import { bubbleColor } from "$lib/appearance/chat-colors";

/**
 * Apply the appearance preferences to the document root as attributes the
 * stylesheet keys off (see src/layout.css): `data-accent`, `data-density`, and
 * `data-reduce-motion`. Chat bubble colors are applied as CSS variables since
 * the choices are arbitrary preset pairs. Call inside an `$effect` so it
 * re-runs whenever the appearance preferences change; mirrors how backdrop
 * blur is applied.
 */
export function applyAppearance(): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;

	const { accent, density, animations } = preferencesSnapshot().appearance;
	root.dataset.accent = accent;
	root.dataset.density = density;
	if (animations) root.removeAttribute("data-reduce-motion");
	else root.setAttribute("data-reduce-motion", "");

	const { bubbleOut, bubbleIn } = preferencesSnapshot().chat;
	const out = bubbleColor(bubbleOut);
	const inbound = bubbleColor(bubbleIn);
	root.style.setProperty("--message-bubble-out", out.bg);
	root.style.setProperty("--message-bubble-out-foreground", out.fg);
	root.style.setProperty("--message-bubble-in", inbound.bg);
	root.style.setProperty("--message-bubble-in-foreground", inbound.fg);
}
