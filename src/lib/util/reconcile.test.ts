import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { callMethodMock, connectedHandlers, droppedHandlers, rejectedHandlers } =
	vi.hoisted(() => ({
		callMethodMock: vi.fn(() => Promise.resolve(1)),
		connectedHandlers: [] as (() => void)[],
		droppedHandlers: [] as ((skipped: number) => void)[],
		rejectedHandlers: [] as ((eventType: string) => void)[],
	}));

vi.mock("$lib/api/methods", async (importOriginal) => ({
	...(await importOriginal<typeof import("$lib/api/methods")>()),
	callMethod: callMethodMock,
}));
vi.mock("$lib/ws.svelte", () => ({
	ws: {
		onConnected(handler: () => void) {
			connectedHandlers.push(handler);
			return Promise.resolve(vi.fn());
		},
		onEventsDropped(handler: (skipped: number) => void) {
			droppedHandlers.push(handler);
			return Promise.resolve(vi.fn());
		},
		onEventRejected(handler: (eventType: string) => void) {
			rejectedHandlers.push(handler);
			return vi.fn();
		},
	},
}));

const flushMicrotasks = async () => {
	await Promise.resolve();
	await Promise.resolve();
};

const flushScheduledResync = () => vi.advanceTimersByTimeAsync(0);

async function freshReconciler() {
	connectedHandlers.length = 0;
	droppedHandlers.length = 0;
	rejectedHandlers.length = 0;
	vi.resetModules();
	const { reconciler } = await import("./reconcile");
	await flushMicrotasks();
	return reconciler;
}

function dropEvents(skipped: number) {
	const [handler] = droppedHandlers;
	if (!handler) throw new Error("nothing subscribed to ws:events-dropped");
	handler(skipped);
}

function reconnect() {
	const [handler] = connectedHandlers;
	if (!handler) throw new Error("nothing subscribed to ws:connected");
	handler();
}

describe("Reconciler resync after dropped websocket events", () => {
	beforeEach(() => {
		vi.useRealTimers();
		vi.useFakeTimers();
		vi.spyOn(console, "warn").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("reconciles immediately when no reconcile is in the throttle window", async () => {
		const reconciler = await freshReconciler();
		const handler = vi.fn();
		reconciler.subscribe(handler);

		dropEvents(3);
		await flushScheduledResync();

		expect(handler).toHaveBeenCalledTimes(1);
	}, 20_000);

	it("defers a resync that lands inside the throttle window instead of dropping it", async () => {
		const reconciler = await freshReconciler();
		const handler = vi.fn();
		reconciler.subscribe(handler);

		dropEvents(3);
		await flushScheduledResync();
		expect(handler).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1200);
		dropEvents(7);
		await flushScheduledResync();
		expect(handler).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(800);
		expect(handler).toHaveBeenCalledTimes(2);
	}, 20_000);

	it("resyncs after a websocket event is rejected as unparsable", async () => {
		const reconciler = await freshReconciler();
		const handler = vi.fn();
		reconciler.subscribe(handler);

		rejectedHandlers.forEach((rejected) => rejected("tap.v1.tap_sent"));
		await flushScheduledResync();

		expect(handler).toHaveBeenCalledTimes(1);
	}, 20_000);

	it("coalesces a burst of drops into a single resync", async () => {
		const reconciler = await freshReconciler();
		const handler = vi.fn();
		reconciler.subscribe(handler);

		dropEvents(3);
		await flushScheduledResync();
		expect(handler).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1000);
		dropEvents(256);
		dropEvents(256);
		dropEvents(256);

		await vi.advanceTimersByTimeAsync(2000);
		expect(handler).toHaveBeenCalledTimes(2);
	}, 20_000);

	it("skips the pending resync when a reconnect reconcile lands after the drop and already covers it", async () => {
		const reconciler = await freshReconciler();
		const handler = vi.fn();
		reconciler.subscribe(handler);

		dropEvents(3);
		await flushScheduledResync();
		expect(handler).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1200);
		dropEvents(7);

		await vi.advanceTimersByTimeAsync(800);
		reconnect();
		reconnect();
		await flushScheduledResync();
		expect(handler).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(2000);
		expect(handler).toHaveBeenCalledTimes(2);
	}, 20_000);
});
