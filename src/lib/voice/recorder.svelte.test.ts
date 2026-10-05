/* eslint-disable @typescript-eslint/unbound-method -- asserting on vi.fn mocks */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { voiceErrorCode, type VoiceNative } from "./native";
import { VoiceRecorder } from "./recorder.svelte";

function fakeNative(overrides: Partial<VoiceNative> = {}): VoiceNative {
	return {
		available: () => true,
		ensureMicrophone: vi.fn(() => Promise.resolve(true)),
		start: vi.fn(() => Promise.resolve()),
		level: vi.fn(() => Promise.resolve(0.5)),
		stop: vi.fn(() => Promise.resolve({ content: "QUFD", lengthMs: 2500 })),
		cancel: vi.fn(() => Promise.resolve()),
		...overrides,
	};
}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("voiceErrorCode", () => {
	it("finds the plugin code inside wrapped errors", () => {
		expect(voiceErrorCode("too-short")).toBe("too-short");
		expect(
			voiceErrorCode(new Error("Media error: permission-denied")),
		).toBe("permission-denied");
		expect(
			voiceErrorCode({ kind: "Media", message: "voice-unavailable" }),
		).toBe("unavailable");
		expect(voiceErrorCode("boom")).toBe("failed");
	});
});

describe("VoiceRecorder", () => {
	it("asks for the microphone, then records and reports elapsed time and level", async () => {
		const native = fakeNative();
		const recorder = new VoiceRecorder(native);

		expect(await recorder.start()).toBeNull();
		expect(recorder.status).toBe("recording");
		expect(native.start).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1000);

		expect(recorder.elapsedMs).toBeGreaterThanOrEqual(900);
		expect(recorder.level).toBe(0.5);
		await recorder.cancel();
	});

	it("does not start without the microphone permission", async () => {
		const native = fakeNative({
			ensureMicrophone: () => Promise.resolve(false),
		});
		const recorder = new VoiceRecorder(native);

		expect(await recorder.start()).toBe("permission-denied");
		expect(recorder.status).toBe("idle");
		expect(native.start).not.toHaveBeenCalled();
	});

	it("maps a failing start to its code and stays idle", async () => {
		const recorder = new VoiceRecorder(
			fakeNative({ start: () => Promise.reject(new Error("busy")) }),
		);

		expect(await recorder.start()).toBe("busy");
		expect(recorder.status).toBe("idle");
	});

	it("hands the recording back when stopped", async () => {
		const recorder = new VoiceRecorder(fakeNative());
		await recorder.start();

		const result = await recorder.stop();

		expect(result).toEqual({
			ok: true,
			recording: { content: "QUFD", lengthMs: 2500 },
		});
		expect(recorder.status).toBe("idle");
		expect(recorder.elapsedMs).toBe(0);
	});

	it("reports a recording that was too short", async () => {
		const recorder = new VoiceRecorder(
			fakeNative({ stop: () => Promise.reject(new Error("too-short")) }),
		);
		await recorder.start();

		expect(await recorder.stop()).toEqual({
			ok: false,
			error: "too-short",
		});
		expect(recorder.status).toBe("idle");
	});

	it("cannot be stopped when it is not recording", async () => {
		const recorder = new VoiceRecorder(fakeNative());

		expect(await recorder.stop()).toEqual({ ok: false, error: "busy" });
	});

	it("cancels the native recording and stops the clock", async () => {
		const native = fakeNative();
		const recorder = new VoiceRecorder(native);
		await recorder.start();

		await recorder.cancel();
		await vi.advanceTimersByTimeAsync(1000);

		expect(native.cancel).toHaveBeenCalledTimes(1);
		expect(recorder.status).toBe("idle");
		expect(recorder.elapsedMs).toBe(0);
		expect(native.level).not.toHaveBeenCalled();
	});

	it("ignores a second start while one is running", async () => {
		const native = fakeNative();
		const recorder = new VoiceRecorder(native);
		await recorder.start();

		expect(await recorder.start()).toBeNull();
		expect(native.start).toHaveBeenCalledTimes(1);
		await recorder.cancel();
	});

	it("reports availability from the native layer", () => {
		expect(new VoiceRecorder(fakeNative()).available).toBe(true);
		expect(
			new VoiceRecorder(fakeNative({ available: () => false })).available,
		).toBe(false);
	});
});
