import { beforeEach, describe, expect, it, vi } from "vitest";

const locationRequest = vi.hoisted(() => ({ run: vi.fn() }));

const preferencesSnapshot = vi.hoisted(() => vi.fn());

vi.mock("$lib/location/location-request.svelte", () => ({ locationRequest }));

vi.mock("$lib/app-data/preferences.svelte", () => ({ preferencesSnapshot }));

vi.mock("$lib/model/geohash", () => ({
	decodeGeohash: (hash: string) => {
		if (hash === "ezjm") return { lat: 43.22, lon: -2.05 };
		throw new Error("bad hash");
	},
}));

import {
	locationMessageDraft,
	resolveChatLocation,
} from "./send-chat-location";

describe("chat location send", () => {
	beforeEach(() => {
		locationRequest.run.mockReset();
		preferencesSnapshot.mockReset();
	});

	it("uses GPS when the existing location service succeeds", async () => {
		locationRequest.run.mockResolvedValue({
			status: "ok",
			coords: { lat: 43.3, lon: -1.9, accuracyMeters: 12 },
		});
		const outcome = await resolveChatLocation();
		expect(outcome.ok).toBe(true);
		if (outcome.ok) {
			expect(outcome.fix.source).toBe("gps");
			expect(outcome.fix.accuracyMeters).toBe(12);
			expect(locationMessageDraft(outcome.fix).outbound).toEqual({
				type: "Location",
				body: { lat: 43.3, lon: -1.9 },
			});
		}
	});

	it("falls back to the stored custom geohash when GPS is unavailable", async () => {
		locationRequest.run.mockResolvedValue({ status: "unsupported" });
		preferencesSnapshot.mockReturnValue({ geohash: "ezjm" });
		const outcome = await resolveChatLocation();
		expect(outcome.ok).toBe(true);
		if (outcome.ok) {
			expect(outcome.fix.source).toBe("custom");
			expect(outcome.fix.lat).toBe(43.22);
		}
	});

	it("does not invent coordinates when cancelled", async () => {
		locationRequest.run.mockResolvedValue({ status: "aborted" });
		preferencesSnapshot.mockReturnValue({ geohash: "ezjm" });
		const outcome = await resolveChatLocation();
		expect(outcome).toMatchObject({ ok: false, aborted: true });
	});
});
