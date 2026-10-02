import { registerAccountCache } from "$lib/api/account-caches";
import {
	existsAppDataFile,
	readAppDataFile,
	writeAppDataFileAtomic,
} from "$lib/app-data";
import {
	appendUsageEvents,
	parseUsageEventsFile,
	type UsageEvent,
} from "./events";

const EVENTS_PATH = "usage-events.json";
const FLUSH_DELAY_MS = 2_000;

export type UsageEventsBackend = {
	load(): Promise<UsageEvent[]>;
	save(events: UsageEvent[]): Promise<void>;
};

export const appDataUsageEventsBackend: UsageEventsBackend = {
	async load() {
		if (!(await existsAppDataFile(EVENTS_PATH))) return [];
		try {
			const bytes = await readAppDataFile(EVENTS_PATH);
			return parseUsageEventsFile(
				JSON.parse(new TextDecoder().decode(bytes)),
			);
		} catch (error) {
			console.error("[usage-events] Failed to read", error);
			return [];
		}
	},
	async save(events) {
		const content = new TextEncoder().encode(
			JSON.stringify({ version: 1, events }),
		);
		await writeAppDataFileAtomic({ path: EVENTS_PATH, content });
	},
};

/**
 * Registro local único de eventos de uso. Se escribe de forma diferida y
 * agrupada: los eventos llegan en ráfagas (varios deslizados seguidos) y no
 * merece la pena reescribir el fichero en cada uno. Nada sale del dispositivo.
 */
export class UsageEventLog {
	#backend: UsageEventsBackend;
	#events: UsageEvent[] | null = null;
	#loading: Promise<UsageEvent[]> | null = null;
	#pending: UsageEvent[] = [];
	#timer: ReturnType<typeof setTimeout> | null = null;
	#saving: Promise<void> = Promise.resolve();

	constructor(backend: UsageEventsBackend = appDataUsageEventsBackend) {
		this.#backend = backend;
	}

	record(event: Omit<UsageEvent, "t"> & { t?: number }): void {
		this.#pending.push({ ...event, t: event.t ?? Date.now() });
		this.#schedule();
	}

	async all(): Promise<UsageEvent[]> {
		const loaded = await this.#load();
		return appendUsageEvents(loaded, this.#pending);
	}

	async clear(): Promise<void> {
		if (this.#timer !== null) clearTimeout(this.#timer);
		this.#timer = null;
		this.#pending = [];
		this.#events = [];
		await this.#enqueue(() => this.#backend.save([]));
	}

	/** Escribe ya lo pendiente (p. ej. al pasar la app a segundo plano). */
	flush(): Promise<void> {
		if (this.#timer !== null) clearTimeout(this.#timer);
		this.#timer = null;
		return this.#flush();
	}

	#schedule(): void {
		if (this.#timer !== null) return;
		this.#timer = setTimeout(() => {
			this.#timer = null;
			void this.#flush();
		}, FLUSH_DELAY_MS);
	}

	async #flush(): Promise<void> {
		if (this.#pending.length === 0) return;
		const loaded = await this.#load();
		const batch = this.#pending;
		this.#pending = [];
		const next = appendUsageEvents(loaded, batch);
		this.#events = next;
		await this.#enqueue(() => this.#backend.save(next)).catch(
			(error: unknown) => {
				console.error("[usage-events] Failed to write", error);
			},
		);
	}

	#load(): Promise<UsageEvent[]> {
		if (this.#events) return Promise.resolve(this.#events);
		this.#loading ??= this.#backend
			.load()
			.then((events) => {
				this.#events ??= events;
				return this.#events;
			})
			.finally(() => {
				this.#loading = null;
			});
		return this.#loading;
	}

	#enqueue(task: () => Promise<void>): Promise<void> {
		const run = this.#saving.then(task);
		this.#saving = run.then(
			() => undefined,
			() => undefined,
		);
		return run;
	}
}

export const usageEvents = new UsageEventLog();

// Las estadísticas son de la cuenta: al cambiar de cuenta se borran.
registerAccountCache({
	reset: () => {
		void usageEvents.clear().catch((error: unknown) => {
			console.error("[usage-events] Failed to clear", error);
		});
	},
});
