import { preferencesSnapshot } from "$lib/app-data/preferences.svelte";

/**
 * Apply the appearance preferences to the document root as attributes the
 * stylesheet keys off (see src/layout.css): `data-accent`, `data-density`, and
 * `data-reduce-motion`. Call inside an `$effect` so it re-runs whenever the
 * appearance preferences change; mirrors how backdrop blur is applied.
 */
export function applyAppearance(): void {
	if (typeof document === "undefined") return;
	const { accent, density, animations } = preferencesSnapshot().appearance;
	const root = document.documentElement;
	root.dataset.accent = accent;
	root.dataset.density = density;
	if (animations) root.removeAttribute("data-reduce-motion");
	else root.setAttribute("data-reduce-motion", "");
}
