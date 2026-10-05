import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { now as currentTime } from "$lib/util/clock";
import { withDeadline } from "$lib/util/deadline";
import { trace } from "./map-trace";
import { isOnlineNow, type ProfileFacts } from "./profile-facts";
import { apiProfilesBackend, type ProfilesBackend } from "./profiles-backend";

/** Who is online changes by the minute. */
const LIVE_REFRESH_MS = 60_000;
/** How often "online right now" is judged again against the clock. */
const CLOCK_TICK_MS = 30_000;
const LIVE_DEADLINE_MS = 20_000;
const DETAILS_DEADLINE_MS = 15_000;
/** The full profile hardly changes. */
const DETAILS_TTL_MS = 30 * 60_000;
/** A profile that could not be fetched is tried again after this long. */
const DETAILS_RETRY_MS = 2 * 60_000;
/** Full profiles are asked for a couple at a time: there can be dozens. */
const DETAILS_CONCURRENCY = 2;

export type LookupStatus = "idle" | "loading" | "ready" | "failed";

/**
 * What the map knows about the profiles behind its pins: who is online (asked
 * for again every minute while the map is open) and, only while a filter
 * needs them, the rest of their profile.
 *
 * Nothing here is awaited by the screen. Taps and panels never wait for the
 * network: facts arrive when they arrive, and everything that depends on them
 * simply changes then. A lookup that fails keeps what was known before.
 */
export class MapProfilesState {
	/** What is known about each profile; readers notice a change to the profile they read. */
	readonly facts = new SvelteMap<number, ProfileFacts>();
	/** The time "online" is judged against; moves on while the map is open. */
	now: number;
	lookup = $state<LookupStatus>("idle");
	/** Profiles whose full data is still to come, for the filters. */
	detailsPending = $state(0);

	readonly #backend: ProfilesBackend;
	readonly #clock: () => number;
	#ids: number[] = [];
	#wantDetails = false;
	#running = false;
	/** Bumped on stop: answers that arrive later are dropped. */
	#epoch = 0;
	#liveRun: Promise<void> | null = null;
	#workers = 0;
	#fetching = new SvelteSet<number>();
	#timers: ReturnType<typeof setInterval>[] = [];

	constructor({
		backend = apiProfilesBackend,
		clock = currentTime,
	}: { backend?: ProfilesBackend; clock?: () => number } = {}) {
		this.#backend = backend;
		this.#clock = clock;
		this.now = $state(clock());
	}

	/** True while an answer that could still change the screen is on its way. */
	get pending(): boolean {
		return this.lookup === "loading" || this.detailsPending > 0;
	}

	isOnline(profileId: number): boolean {
		return isOnlineNow(this.facts.get(profileId), this.now);
	}

	/** Says which profiles to look after, and whether their full data is wanted. */
	track(ids: readonly number[], { details }: { details: boolean }): void {
		const next = [...new SvelteSet(ids)].sort((a, b) => a - b);
		const sameIds =
			next.length === this.#ids.length &&
			next.every((id, index) => id === this.#ids[index]);
		if (sameIds && details === this.#wantDetails) return;
		this.#ids = next;
		this.#wantDetails = details;
		if (!this.#running) return;
		if (!sameIds) void this.refreshLive();
		this.#startWorkers();
	}

	start(): void {
		if (this.#running) return;
		this.#running = true;
		this.now = this.#clock();
		this.#timers = [
			setInterval(() => void this.refreshLive(), LIVE_REFRESH_MS),
			setInterval(() => (this.now = this.#clock()), CLOCK_TICK_MS),
		];
		document.addEventListener("visibilitychange", this.#onVisibility);
		void this.refreshLive();
		this.#startWorkers();
	}

	stop(): void {
		if (!this.#running) return;
		this.#running = false;
		this.#epoch += 1;
		for (const timer of this.#timers) clearInterval(timer);
		this.#timers = [];
		document.removeEventListener("visibilitychange", this.#onVisibility);
		this.#liveRun = null;
		this.lookup = "idle";
		this.detailsPending = 0;
	}

	/** Asks again who is online. Calls made while one is running share it. */
	refreshLive(): Promise<void> {
		if (!this.#running || this.#ids.length === 0 || document.hidden) {
			return Promise.resolve();
		}
		this.#liveRun ??= this.#lookUp().finally(() => (this.#liveRun = null));
		return this.#liveRun;
	}

	readonly #onVisibility = (): void => {
		if (document.hidden) return;
		this.now = this.#clock();
		void this.refreshLive();
	};

	async #lookUp(): Promise<void> {
		const epoch = this.#epoch;
		const ids = this.#ids;
		this.lookup = "loading";
		try {
			const found = await withDeadline({
				work: () => this.#backend.lookup(ids),
				ms: LIVE_DEADLINE_MS,
			});
			if (epoch !== this.#epoch) return;
			const at = this.#clock();
			for (const id of ids) {
				const live = found.get(id);
				if (live !== undefined) {
					this.facts.set(id, {
						...this.facts.get(id),
						live,
						liveAt: at,
					});
				}
			}
			this.now = at;
			this.lookup = "ready";
			// Full profiles that failed earlier get another try now and then.
			this.#startWorkers();
		} catch (error) {
			if (epoch !== this.#epoch) return;
			trace(`profile lookup failed: ${String(error).slice(0, 80)}`);
			this.lookup = "failed";
		}
	}

	// --- full profiles -------------------------------------------------------

	#needsDetails(id: number): boolean {
		const known = this.facts.get(id);
		if (known?.details === undefined) return true;
		const age = this.#clock() - (known.detailsAt ?? 0);
		return (
			age > (known.details === null ? DETAILS_RETRY_MS : DETAILS_TTL_MS)
		);
	}

	#nextDetailsId(): number | undefined {
		return this.#ids.find(
			(id) => !this.#fetching.has(id) && this.#needsDetails(id),
		);
	}

	#countPending(): number {
		return this.#ids.filter((id) => this.#needsDetails(id)).length;
	}

	#startWorkers(): void {
		if (!this.#running || !this.#wantDetails) {
			this.detailsPending = 0;
			return;
		}
		this.detailsPending = this.#countPending();
		// A worker with nothing to do ends at once, so count the ones to start
		// instead of looping until enough are running.
		const missing = DETAILS_CONCURRENCY - this.#workers;
		for (let started = 0; started < missing; started += 1) {
			this.#workers += 1;
			void this.#work();
		}
	}

	async #work(): Promise<void> {
		const epoch = this.#epoch;
		try {
			for (;;) {
				if (epoch !== this.#epoch || !this.#wantDetails) return;
				const id = this.#nextDetailsId();
				if (id === undefined) return;
				this.#fetching.add(id);
				const details = await withDeadline({
					work: () => this.#backend.details(id),
					ms: DETAILS_DEADLINE_MS,
				}).catch((error: unknown) => {
					trace(
						`profile details failed: ${String(error).slice(0, 80)}`,
					);
					return null;
				});
				this.#fetching.delete(id);
				if (epoch !== this.#epoch) return;
				this.#keepDetails(id, details);
			}
		} finally {
			this.#workers -= 1;
			if (epoch === this.#epoch)
				this.detailsPending = this.#countPending();
		}
	}

	#keepDetails(id: number, details: ProfileFacts["details"]): void {
		this.facts.set(id, {
			...this.facts.get(id),
			details,
			detailsAt: this.#clock(),
		});
		this.detailsPending = this.#countPending();
	}
}
