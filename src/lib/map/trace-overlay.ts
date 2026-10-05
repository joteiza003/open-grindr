/**
 * The diagnostics report shown over the screen, built with plain DOM.
 *
 * It is deliberately not a Svelte component: its whole point is to still work
 * when the reactive layer of the screen has stopped updating. Inline styles
 * and native listeners only.
 */

const OVERLAY_ID = "map-diagnostics-overlay";
/** Above the splash screen (2147483000) and every dialog. */
const OVERLAY_Z_INDEX = "2147483600";

export type OverlayTexts = {
	title: string;
	hint: string;
	copy: string;
	reload: string;
	home: string;
	close: string;
	copied: string;
	copyFailed: string;
};

export type OverlayOptions = {
	/** Also copy the report as soon as the overlay opens. */
	autoCopy?: boolean;
	/** Starts the page over. */
	reload?: () => void;
	/** Loads the home screen afresh, whatever state the router is in. */
	home?: () => void;
};

async function copyText(text: string): Promise<boolean> {
	try {
		const { writeText } =
			await import("@tauri-apps/plugin-clipboard-manager");
		await writeText(text);
		return true;
	} catch {
		// Not inside Tauri, or the plugin refused: try the browser.
	}
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}

function styled<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	css: string,
	text?: string,
): HTMLElementTagNameMap[K] {
	const element = document.createElement(tag);
	element.style.cssText = css;
	if (text !== undefined) element.textContent = text;
	return element;
}

const BUTTON_CSS =
	"flex:1 1 40%;min-height:44px;border:0;border-radius:12px;background:#3f3f46;color:#fafafa;font:600 14px system-ui,sans-serif;";

export function isTraceOverlayOpen(): boolean {
	return document.getElementById(OVERLAY_ID) !== null;
}

export function closeTraceOverlay(): void {
	document.getElementById(OVERLAY_ID)?.remove();
}

/**
 * Shows the report with a Copy button. Replaces an overlay already open.
 * With `autoCopy` the report also goes to the clipboard at once: when the
 * screen is stuck, that may be the only way to get it out. Reload and Home
 * are plain page loads, so they leave a screen that is stuck for good.
 */
export function showTraceOverlay(
	texts: OverlayTexts,
	report: string,
	{
		autoCopy = false,
		reload = () => window.location.reload(),
		home = () => window.location.assign("/"),
	}: OverlayOptions = {},
): void {
	closeTraceOverlay();

	const overlay = styled(
		"div",
		`position:fixed;inset:0;z-index:${OVERLAY_Z_INDEX};display:flex;flex-direction:column;gap:8px;padding:12px;box-sizing:border-box;background:rgba(0,0,0,.92);color:#f5f5f5;font:13px/1.4 system-ui,sans-serif;pointer-events:auto;`,
	);
	overlay.id = OVERLAY_ID;
	overlay.setAttribute("role", "dialog");
	overlay.setAttribute("aria-label", texts.title);

	const title = styled(
		"h2",
		"margin:0;font:700 16px system-ui,sans-serif;",
		texts.title,
	);
	const hint = styled("p", "margin:0;color:#a1a1aa;", texts.hint);
	const body = styled(
		"pre",
		"flex:1;min-height:0;overflow:auto;margin:0;padding:8px;border-radius:8px;background:#18181b;font:10px/1.35 ui-monospace,monospace;white-space:pre-wrap;word-break:break-word;user-select:text;-webkit-user-select:text;",
		report,
	);
	const status = styled("p", "margin:0;min-height:18px;color:#ffba20;");
	status.setAttribute("role", "status");

	const copyReport = () => {
		void copyText(report).then((copied) => {
			status.textContent = copied ? texts.copied : texts.copyFailed;
			if (!copied) {
				// Leave the text selected so it can be copied by hand.
				const range = document.createRange();
				range.selectNodeContents(body);
				const selection = window.getSelection();
				selection?.removeAllRanges();
				selection?.addRange(range);
			}
		});
	};
	const action = (label: string, onClick: () => void) => {
		const element = styled("button", BUTTON_CSS, label);
		element.type = "button";
		element.addEventListener("click", onClick);
		return element;
	};

	const buttons = styled("div", "display:flex;flex-wrap:wrap;gap:8px;");
	buttons.append(
		action(texts.copy, copyReport),
		action(texts.reload, reload),
		action(texts.home, home),
		action(texts.close, closeTraceOverlay),
	);
	overlay.append(title, hint, body, status, buttons);
	document.body.append(overlay);
	if (autoCopy) copyReport();
}
