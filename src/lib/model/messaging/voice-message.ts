import type { MessageDraft } from "./messages";

export const VOICE_CONTENT_TYPE = "audio/aac";

/** A voice message: the server only needs the uploaded media's id. */
export function voiceMessageDraft({
	mediaId,
	url,
	mediaHash,
	lengthMs,
}: {
	mediaId: number;
	url: string | null;
	mediaHash: string | null;
	lengthMs: number;
}): MessageDraft {
	return {
		outbound: { type: "Audio", body: { mediaId } },
		optimistic: {
			type: "Audio",
			body: {
				mediaId,
				mediaHash,
				// Until the server echoes the message there may be no playable URL.
				url: url ?? "",
				contentType: VOICE_CONTENT_TYPE,
				length: lengthMs,
				expiresAt: null,
			},
		},
	};
}

/** "0:07" / "12:03" — whole seconds, minutes unpadded. */
export function formatVoiceDuration(ms: number): string {
	const total = Math.max(0, Math.round(ms / 1000));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
