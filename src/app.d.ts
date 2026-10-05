import type { NativeInsets } from "$lib/platform/android-native-bridge";

declare global {
	/** The commit a CI build was made from, "dev" anywhere else; see vite.config.mjs. */
	const __BUILD_ID__: string;

	namespace App {
		interface PageState {
			profileOrigin?: "browse";
		}
	}

	interface Window {
		__reapplyInsets: (insets?: NativeInsets) => unknown;
		__AndroidInsets?: {
			top(): number;
			bottom(): number;
			left(): number;
			right(): number;
			imeVisible?(): boolean;
		};
		__AndroidOnBackGesture?: () => boolean;
		__AndroidOnBackGestureStart?: () => boolean;
		__AndroidOnBackGestureCancel?: () => void;
		__AndroidBack?: { moveTaskToBack(): void; gestureProgress(): number };
		pswp?: unknown;
	}
}

export {};
