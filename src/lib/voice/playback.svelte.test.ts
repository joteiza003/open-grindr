import { describe, expect, it, vi } from "vitest";

import { type AudioLike, VoicePlayback } from "./playback.svelte";

class FakeAudio implements AudioLike {
	currentTime = 0;
	duration = Number.NaN;
	playbackRate = 1;
	readonly listeners = new Map<string, (() => void)[]>();
	readonly play = vi.fn(() => Promise.resolve());
	readonly pause = vi.fn();

	constructor(public src: string) {}

	addEventListener(type: string, listener: () => void) {
		this.listeners.set(type, [
			...(this.listeners.get(type) ?? []),
			listener,
		]);
	}

	removeEventListener() {}

	emit(type: string) {
		for (const listener of this.listeners.get(type) ?? []) listener();
	}
}

function player(
	url: string | null = "blob:voice",
	lengthMs: number | null = 4000,
) {
	const created: FakeAudio[] = [];
	const playback = new VoicePlayback({
		url,
		lengthMs,
		createAudio: (src) => {
			const audio = new FakeAudio(src);
			created.push(audio);
			return audio;
		},
	});
	return { playback, created };
}

describe("VoicePlayback", () => {
	it("knows its length before anything loads", () => {
		const { playback } = player();

		expect(playback.durationMs).toBe(4000);
		expect(playback.playable).toBe(true);
	});

	it("is not playable without a url, and never creates audio", async () => {
		const { playback, created } = player(null);

		expect(playback.playable).toBe(false);
		await playback.toggle();

		expect(created).toHaveLength(0);
		expect(playback.playing).toBe(false);
	});

	it("plays and pauses", async () => {
		const { playback, created } = player();

		await playback.toggle();
		expect(playback.playing).toBe(true);
		expect(created[0]?.play).toHaveBeenCalledTimes(1);

		await playback.toggle();
		expect(playback.playing).toBe(false);
		expect(created[0]?.pause).toHaveBeenCalled();
	});

	it("follows the audio's progress and real duration", async () => {
		const { playback, created } = player("blob:voice", null);
		await playback.toggle();
		const audio = created[0] as FakeAudio;

		audio.duration = 7.5;
		audio.emit("loadedmetadata");
		audio.currentTime = 2;
		audio.emit("timeupdate");

		expect(playback.durationMs).toBe(7500);
		expect(playback.positionMs).toBe(2000);
	});

	it("rewinds when it ends", async () => {
		const { playback, created } = player();
		await playback.toggle();
		const audio = created[0] as FakeAudio;
		audio.currentTime = 3;
		audio.emit("timeupdate");

		audio.emit("ended");

		expect(playback.playing).toBe(false);
		expect(playback.positionMs).toBe(0);
		expect(audio.currentTime).toBe(0);
	});

	it("starting one message pauses the one that was playing", async () => {
		const first = player();
		const second = player();
		await first.playback.toggle();

		await second.playback.toggle();

		expect(first.playback.playing).toBe(false);
		expect(first.created[0]?.pause).toHaveBeenCalled();
		expect(second.playback.playing).toBe(true);
	});

	it("marks itself failed when the audio can't play", async () => {
		const { playback, created } = player();
		await playback.toggle();
		created[0]?.emit("error");

		expect(playback.failed).toBe(true);
		expect(playback.playable).toBe(false);
		expect(playback.playing).toBe(false);
	});

	it("marks itself failed when play() is refused", async () => {
		const created: FakeAudio[] = [];
		const playback = new VoicePlayback({
			url: "blob:voice",
			lengthMs: 1000,
			createAudio: (src) => {
				const audio = new FakeAudio(src);
				audio.play.mockRejectedValueOnce(new Error("NotAllowedError"));
				created.push(audio);
				return audio;
			},
		});
		vi.spyOn(console, "error").mockImplementation(() => {});

		await playback.toggle();

		expect(playback.failed).toBe(true);
		expect(playback.playing).toBe(false);
	});

	it("seeks within the message", () => {
		const { playback, created } = player();
		playback.seek(2500);

		expect(created[0]?.currentTime).toBe(2.5);
		expect(playback.positionMs).toBe(2500);

		playback.seek(99_000);
		expect(playback.positionMs).toBe(4000);
		playback.seek(-5);
		expect(playback.positionMs).toBe(0);
	});
});

describe("VoicePlayback speed", () => {
	it("cycles 1x, 1.5x, 2x and back to 1x", () => {
		const { playback } = player();
		expect(playback.rate).toBe(1);
		playback.cycleRate();
		expect(playback.rate).toBe(1.5);
		playback.cycleRate();
		expect(playback.rate).toBe(2);
		playback.cycleRate();
		expect(playback.rate).toBe(1);
	});

	it("applies the chosen speed to the audio, now and when it is created", async () => {
		const { playback, created } = player();
		playback.cycleRate();
		await playback.toggle();
		expect(created[0]?.playbackRate).toBe(1.5);
		playback.cycleRate();
		expect(created[0]?.playbackRate).toBe(2);
	});

	it("exposes the address of the audio it plays", () => {
		expect(player("blob:voice").playback.audioUrl).toContain("voice");
		expect(player(null).playback.audioUrl).toBeNull();
	});
});
