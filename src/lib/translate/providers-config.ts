import { type NativeTranslate, native as realNative } from "./native";
import { createOnDeviceProvider } from "./on-device";
import {
	createLingvaProvider,
	createMyMemoryProvider,
	type Provider,
} from "./providers";

export type ProviderSettings = {
	onDevice: boolean;
	onlineFallback: boolean;
	email: string;
};

/**
 * Provider order: on-device first (private, no quota) when the phone supports
 * it and the user wants it, then the free online services. Where there is no
 * on-device option (desktop), online is the only choice.
 */
export function buildProviders(
	settings: ProviderSettings,
	native: NativeTranslate = realNative,
): Provider[] {
	const deviceActive = settings.onDevice && native.available();
	const providers: Provider[] = [];
	if (deviceActive) providers.push(createOnDeviceProvider(native));
	if (settings.onlineFallback || !deviceActive) {
		providers.push(
			createMyMemoryProvider({ email: settings.email }),
			createLingvaProvider(),
		);
	}
	return providers;
}
