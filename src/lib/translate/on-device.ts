import { nativeErrorCode, type NativeTranslate } from "./native";
import { type Provider, TranslateError } from "./providers";

/**
 * Provider backed by ML Kit on the phone: the text never leaves the device.
 * It refuses (so the chain can fall through to an online provider, if the user
 * allows one) when the language is unsupported, undetectable, or its model
 * isn't downloaded.
 */
export function createOnDeviceProvider(native: NativeTranslate): Provider {
	return {
		id: "on-device",
		async translate(request) {
			let source = request.from;
			if (source === "auto") {
				let detected: string;
				try {
					detected = await native.identify(request.text);
				} catch {
					throw new TranslateError(
						"bad-response",
						"Detection failed",
					);
				}
				if (detected === "und") {
					if (!request.fallbackFrom) {
						throw new TranslateError(
							"bad-response",
							"Language could not be detected",
						);
					}
					detected = request.fallbackFrom;
				}
				source = detected;
			}
			if (source === request.to)
				return { text: request.text, detected: source };
			try {
				const text = await native.translate(
					request.text,
					source,
					request.to,
				);
				return { text, detected: source };
			} catch (error) {
				const code = nativeErrorCode(error);
				if (code === "unsupported-language") {
					throw new TranslateError(
						"unsupported",
						`${source} not offline`,
					);
				}
				if (code === "model-missing") {
					throw new TranslateError(
						"model-missing",
						"Model not downloaded",
					);
				}
				throw new TranslateError("bad-response", "On-device failed");
			}
		},
	};
}
