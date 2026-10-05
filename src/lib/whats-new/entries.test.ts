import { describe, expect, it } from "vitest";

import { en } from "$lib/i18n/en";
import {
	shouldShowWhatsNew,
	WHATS_NEW_ENTRIES,
	WHATS_NEW_VERSION,
} from "./entries";

describe("shouldShowWhatsNew", () => {
	it("shows it once per version, after onboarding", () => {
		expect(shouldShowWhatsNew({ seen: "", onboardingComplete: true })).toBe(
			true,
		);
		expect(
			shouldShowWhatsNew({
				seen: WHATS_NEW_VERSION,
				onboardingComplete: true,
			}),
		).toBe(false);
		expect(
			shouldShowWhatsNew({ seen: "", onboardingComplete: false }),
		).toBe(false);
		expect(
			shouldShowWhatsNew({
				seen: "old",
				latest: "new",
				onboardingComplete: true,
			}),
		).toBe(true);
	});
});

describe("WHATS_NEW_ENTRIES", () => {
	it("has unique ids and texts that exist in the catalog", () => {
		const ids = WHATS_NEW_ENTRIES.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const entry of WHATS_NEW_ENTRIES) {
			expect(en).toHaveProperty([entry.title]);
			expect(en).toHaveProperty([entry.body]);
			expect(entry.href.startsWith("/")).toBe(true);
		}
	});
});
