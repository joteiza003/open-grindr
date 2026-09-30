import z from "zod";

import { signedInProfileId } from "$lib/api/current-session";
import { uploadVoiceRest } from "$lib/api/transport";
import type { VoiceRecording } from "$lib/voice/native";

// The audio upload answers like a photo/video one, but only the id is relied on.
const voiceUploadSchema = z.object({
	mediaId: z.int(),
	url: z.string().nullish(),
	mediaHash: z.string().nullish(),
});

export type UploadedVoice = {
	mediaId: number;
	url: string | null;
	mediaHash: string | null;
};

export async function uploadVoiceMessage(
	recording: VoiceRecording,
): Promise<UploadedVoice> {
	const profileId = await signedInProfileId();
	if (profileId === null) throw new Error("Not signed in");
	const { response } = await uploadVoiceRest({
		content: recording.content,
		lengthMs: recording.lengthMs,
		profileId,
	});
	const uploaded = response.jsonParsed(voiceUploadSchema);
	return {
		mediaId: uploaded.mediaId,
		url: uploaded.url ?? null,
		mediaHash: uploaded.mediaHash ?? null,
	};
}
