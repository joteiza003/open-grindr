import { proxyMediaUrl } from "$lib/util/media";

/** The slice of HTMLAudioElement the player relies on (easy to fake in tests). */
export type AudioLike = {
	src: string;
	currentTime: number;
	duration: number;
	play(): Promise<void>;
	pause(): void;
	addEventListener(type: string, listener: () => void): void;
	removeEventListener(type: string, listener: () => void): void;
};

/** Plays one voice message; starting another one pauses the first. */
export class VoicePlayback {
	static #active: VoicePlayback | null = null;

	playing = $state(false);
	positionMs = $state(0);
	durationMs = $state(0);
	failed = $state(false);

	#url: string | null;
	#create: (src: string) => AudioLike;
	#audio: AudioLike | null = null;

	constructor({
		url,
		lengthMs,
		createAudio = (src) => {
			const audio = new Audio(src);
			audio.preload = "metadata";
			return audio;
		},
	}: {
		url: string | null;
		lengthMs: number | null;
		createAudio?: (src: string) => AudioLike;
	}) {
		this.#url = url === null || url === "" ? null : url;
		this.durationMs = lengthMs ?? 0;
		this.#create = createAudio;
	}

	get playable(): boolean {
		return this.#url !== null && !this.failed;
	}

	async toggle(): Promise<void> {
		if (this.playing) {
			this.pause();
			return;
		}
		const audio = this.#ensure();
		if (audio === null) return;
		VoicePlayback.#active?.pause();
		VoicePlayback.#active = this;
		try {
			await audio.play();
			this.playing = true;
		} catch (error) {
			console.error("[voice] playback failed", error);
			this.failed = true;
			this.playing = false;
			if (VoicePlayback.#active === this) VoicePlayback.#active = null;
		}
	}

	pause(): void {
		this.#audio?.pause();
		this.playing = false;
		if (VoicePlayback.#active === this) VoicePlayback.#active = null;
	}

	seek(ms: number): void {
		const audio = this.#ensure();
		if (audio === null) return;
		const clamped = Math.min(Math.max(0, ms), this.durationMs || ms);
		audio.currentTime = clamped / 1000;
		this.positionMs = clamped;
	}

	destroy(): void {
		this.pause();
		this.#audio = null;
	}

	#ensure(): AudioLike | null {
		if (this.#url === null) return null;
		if (this.#audio !== null) return this.#audio;
		const audio = this.#create(proxyMediaUrl(this.#url, { as: "video" }));
		audio.addEventListener("timeupdate", () => {
			this.positionMs = audio.currentTime * 1000;
		});
		audio.addEventListener("loadedmetadata", () => {
			if (Number.isFinite(audio.duration) && audio.duration > 0) {
				this.durationMs = audio.duration * 1000;
			}
		});
		audio.addEventListener("ended", () => {
			this.playing = false;
			this.positionMs = 0;
			audio.currentTime = 0;
			if (VoicePlayback.#active === this) VoicePlayback.#active = null;
		});
		audio.addEventListener("error", () => {
			this.failed = true;
			this.playing = false;
			if (VoicePlayback.#active === this) VoicePlayback.#active = null;
		});
		this.#audio = audio;
		return audio;
	}
}
