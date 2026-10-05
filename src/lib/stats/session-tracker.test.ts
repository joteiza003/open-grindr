import { afterEach, describe, expect, it, vi } from "vitest";

import { UsageEventLog } from "./event-log";
import { startSessionTracking } from "./session-tracker";

function setHidden(hidden: boolean) {
	Object.defineProperty(document, "hidden", {
		configurable: true,
		get: () => hidden,
	});
	document.dispatchEvent(new Event("visibilitychange"));
}

function setup() {
	const log = new UsageEventLog({
		load: () => Promise.resolve([]),
		save: () => Promise.resolve(),
	});
	const record = vi.spyOn(log, "record");
	let clock = 1_000_000;
	const stop = startSessionTracking({ log, now: () => clock });
	return {
		record,
		stop,
		advance: (ms: number) => {
			clock += ms;
		},
	};
}

describe("startSessionTracking", () => {
	afterEach(() => setHidden(false));

	it("records the foreground time when the app goes to the background", () => {
		setHidden(false);
		const { record, stop, advance } = setup();
		advance(90_000);
		setHidden(true);
		expect(record).toHaveBeenCalledWith({
			k: "session",
			t: 1_000_000,
			d: 90,
		});
		stop();
	});

	it("ignores blips shorter than the minimum", () => {
		setHidden(false);
		const { record, stop, advance } = setup();
		advance(2_000);
		setHidden(true);
		expect(record).not.toHaveBeenCalled();
		stop();
	});

	it("starts a new session when the app comes back", () => {
		setHidden(false);
		const { record, stop, advance } = setup();
		advance(10_000);
		setHidden(true);
		advance(60_000);
		setHidden(false);
		advance(20_000);
		setHidden(true);
		expect(record).toHaveBeenCalledTimes(2);
		expect(record).toHaveBeenLastCalledWith({
			k: "session",
			t: 1_070_000,
			d: 20,
		});
		stop();
	});
});
