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

	const { accent, density, animations, theme, look } =
		preferencesSnapshot().appearance;
	root.dataset.accent = accent;
	root.dataset.density = density;
	// Look de fábrica (src/lib/appearance/looks.ts): "lumen" es neutro y frío,
	// "midnight" conserva el material anterior (cálido, con grano y lavado
	// radial del acento), "porcelain" y "slate" ajustan bordes y elevación.
	root.dataset.look = look;
	if (animations) root.removeAttribute("data-reduce-motion");
	else root.setAttribute("data-reduce-motion", "");

	// System stays dark-first so unset devices keep the designed look.
	root.dataset.theme = theme === "light" ? "light" : "dark";
	document.body?.classList.toggle("dark", theme !== "light");
	document.body?.classList.toggle("og-grain", look === "midnight");

	const locale = preferencesSnapshot().locale;
	root.lang = locale;
	root.dataset.locale = locale;

	const chat = preferencesSnapshot().chat;
	root.dataset.chatStyle = chat.style;
	if (chat.style === "whatsapp") {
		// WhatsApp dark-mode palette. Restored to user presets when style is default.
		root.style.setProperty("--message-bubble-out", "#005c4b");
		root.style.setProperty("--message-bubble-out-foreground", "#e9edef");
		root.style.setProperty("--message-bubble-in", "#202c33");
		root.style.setProperty("--message-bubble-in-foreground", "#e9edef");
	} else {
		const out = bubbleColor(chat.bubbleOut);
		const inbound = bubbleColor(chat.bubbleIn);
		root.style.setProperty("--message-bubble-out", out.bg);
		root.style.setProperty("--message-bubble-out-foreground", out.fg);
		root.style.setProperty("--message-bubble-in", inbound.bg);
		root.style.setProperty("--message-bubble-in-foreground", inbound.fg);
	}
}
