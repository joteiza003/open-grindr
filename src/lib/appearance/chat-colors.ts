import { z } from "zod";

/**
 * Curated chat bubble presets. Each preset pairs a background with a foreground
 * chosen for legibility, so the user can recolor their own and the other
 * person's bubbles independently without contrast problems.
 *
 * Applied by setting the `--message-bubble-{in,out}` and
 * `--message-bubble-{in,out}-foreground` CSS variables (see appearance.ts and
 * the tokens in layout.css). Sent bubbles read these; received "unsent"
 * placeholders keep the muted styling.
 */
export type BubbleColor = {
	key: string;
	label: string;
	bg: string;
	fg: string;
};

const BLACK = "oklch(0 0 0)";
const WHITE = "oklch(0.98 0 0)";

export const bubbleColors = [
	{ key: "amber", label: "Amber", bg: "oklch(0.862 0.197 90)", fg: BLACK },
	{ key: "blue", label: "Blue", bg: "oklch(0.788 0.145 228)", fg: BLACK },
	{ key: "teal", label: "Teal", bg: "oklch(0.8 0.13 190)", fg: BLACK },
	{ key: "green", label: "Green", bg: "oklch(0.8 0.17 145)", fg: BLACK },
	{ key: "pink", label: "Pink", bg: "oklch(0.78 0.16 350)", fg: BLACK },
	{ key: "violet", label: "Violet", bg: "oklch(0.62 0.19 300)", fg: WHITE },
	{ key: "red", label: "Red", bg: "oklch(0.62 0.22 25)", fg: WHITE },
	{ key: "slate", label: "Slate", bg: "oklch(0.5 0.06 265)", fg: WHITE },
	{
		key: "graphite",
		label: "Graphite",
		bg: "oklch(0.37 0.008 0)",
		fg: WHITE,
	},
] as const satisfies readonly BubbleColor[];

export type BubbleColorKey = (typeof bubbleColors)[number]["key"];

const bubbleColorKeys = bubbleColors.map((color) => color.key) as [
	BubbleColorKey,
	...BubbleColorKey[],
];

export const bubbleColorSchema = z.enum(bubbleColorKeys);

export function bubbleColor(key: BubbleColorKey): BubbleColor {
	return bubbleColors.find((color) => color.key === key) ?? bubbleColors[0];
}

/** Defaults mirror the app's original bubble colors. */
export const DEFAULT_BUBBLE_OUT: BubbleColorKey = "amber";
export const DEFAULT_BUBBLE_IN: BubbleColorKey = "blue";

/** Curated solid background colors for the chat area. */
export const chatBackgroundColors = [
	"oklch(0.145 0 0)",
	"oklch(0.205 0 0)",
	"oklch(0.26 0.03 265)",
	"oklch(0.28 0.04 300)",
	"oklch(0.28 0.05 20)",
	"oklch(0.27 0.05 150)",
	"oklch(0.3 0.03 90)",
	"oklch(0.32 0.02 220)",
] as const;

export const DEFAULT_CHAT_BACKGROUND_COLOR = chatBackgroundColors[0];
