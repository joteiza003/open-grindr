import { decode, encode } from "@msgpack/msgpack";
import { toast } from "svelte-sonner";
import z from "zod";

import { accentSchema, DEFAULT_ACCENT } from "$lib/appearance/accents";
import {
	bubbleColorSchema,
	DEFAULT_BUBBLE_IN,
	DEFAULT_BUBBLE_OUT,
	DEFAULT_CHAT_BACKGROUND_COLOR,
} from "$lib/appearance/chat-colors";
import { backdropBlurCalibrationSchema } from "$lib/blur/calibration/decide";
import { backdropBlurQualitySchema } from "$lib/blur/quality";
import { DEFAULT_LOCALE, localeSchema } from "$lib/i18n/locales";
import { gridSearchFiltersSchema } from "$lib/model/browse/grid/filters";
import { geohashSchema } from "$lib/model/geohash";
import { unitSystemSchema } from "$lib/util/units";
import {
	existsAppDataFile,
	readAppDataFile,
	removeAppDataFile,
	writeAppDataFileAtomic,
} from ".";

const preferencesSchema = z.object({
	autoUpdateLocation: z.boolean().default(false),
	backdropBlurCalibration: backdropBlurCalibrationSchema
		.nullable()
		.default(null)
		.catch(null),
	backdropBlurQuality: backdropBlurQualitySchema
		.nullable()
		.default(null)
		.catch(null),
	geohash: geohashSchema.nullable().default(null),
	hapticFeedback: z.boolean().default(true),
	onboardingComplete: z.boolean().default(false),
	gridSearchFilters: gridSearchFiltersSchema.optional(),
	revealMessageRead: z.boolean().default(false),
	revealProfileViews: z.boolean().default(false),
	stayOnline: z.boolean().default(true),
	units: unitSystemSchema.default("metric"),
	locale: localeSchema.default(DEFAULT_LOCALE),
	appearance: z
		.object({
			theme: z.enum(["system", "dark", "light"]).default("system"),
			accent: accentSchema.default(DEFAULT_ACCENT),
			density: z.enum(["comfortable", "compact"]).default("comfortable"),
			animations: z.boolean().default(true),
		})
		.default({
			theme: "system",
			accent: DEFAULT_ACCENT,
			density: "comfortable",
			animations: true,
		}),
	browse: z
		.object({
			viewMode: z.enum(["grid", "compact", "detailed"]).default("grid"),
			cardDensity: z
				.enum(["comfortable", "dense"])
				.default("comfortable"),
			showName: z.boolean().default(true),
			showDistance: z.boolean().default(true),
			showAge: z.boolean().default(true),
			showOnlineStatus: z.boolean().default(true),
			nameStyle: z.enum(["solid", "gradient", "none"]).default("solid"),
			// null = use the design default (keeps the tuned grid + its e2e
			// corner test untouched); a number overrides it in pixels.
			cardRadius: z.number().min(0).max(40).nullable().default(null),
			cardGap: z.number().min(0).max(24).nullable().default(null),
		})
		.default({
			viewMode: "grid",
			cardDensity: "comfortable",
			showName: true,
			showDistance: true,
			showAge: true,
			showOnlineStatus: true,
			nameStyle: "solid",
			cardRadius: null,
			cardGap: null,
		}),
	chat: z
		.object({
			density: z.enum(["comfortable", "compact"]).default("comfortable"),
			mediaPreview: z.boolean().default(true),
			style: z.enum(["default", "whatsapp"]).default("default"),
			bubbleOut: bubbleColorSchema.default(DEFAULT_BUBBLE_OUT),
			bubbleIn: bubbleColorSchema.default(DEFAULT_BUBBLE_IN),
			background: z
				.object({
					kind: z.enum(["none", "color", "photo"]).default("none"),
					color: z.string().default(DEFAULT_CHAT_BACKGROUND_COLOR),
					blur: z.number().min(0).max(30).default(8),
					dim: z.number().min(0).max(0.85).default(0.35),
					photoUpdatedAt: z.number().default(0),
				})
				.default({
					kind: "none",
					color: DEFAULT_CHAT_BACKGROUND_COLOR,
					blur: 8,
					dim: 0.35,
					photoUpdatedAt: 0,
				}),
		})
		.default({
			density: "comfortable",
			mediaPreview: true,
			style: "default",
			bubbleOut: DEFAULT_BUBBLE_OUT,
			bubbleIn: DEFAULT_BUBBLE_IN,
			background: {
				kind: "none",
				color: DEFAULT_CHAT_BACKGROUND_COLOR,
				blur: 8,
				dim: 0.35,
				photoUpdatedAt: 0,
			},
		}),
});

type Preferences = z.infer<typeof preferencesSchema>;

export type BooleanPreference = {
	[Key in keyof Preferences]-?: Preferences[Key] extends boolean
		? Key
		: never;
}[keyof Preferences];

let writeQueue: Promise<unknown> = Promise.resolve();
let snapshot = $state<Preferences>(preferencesSchema.parse({}));
let loaded = $state(false);

function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
	const run = writeQueue.then(task);
	writeQueue = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

let cache: Preferences | null = null;
let hydrating: Promise<Preferences> | null = null;

function publish(preferences: Preferences): void {
	cache = preferences;
	snapshot = preferences;
	loaded = true;
}

async function readFromDisk(): Promise<Preferences> {
	if (!(await existsAppDataFile("preferences.data"))) {
		return preferencesSchema.parse({});
	}
	const bytes = await readAppDataFile("preferences.data");
	return preferencesSchema.parse(decode(bytes));
}

export async function getPreferences(): Promise<Preferences> {
	if (cache !== null) return structuredClone(cache);
	hydrating ??= readFromDisk()
		.then((preferences) => {
			publish(preferences);
			return preferences;
		})
		.catch((error: unknown) => {
			console.error(error);
			toast.error("Failed to load preferences. Reset to defaults?", {
				action: {
					label: "Reset",
					onClick: () => void resetToDefaults(),
				},
				duration: 10000,
				id: "load-preferences-error",
			});
			throw error;
		})
		.finally(() => {
			hydrating = null;
		});
	return structuredClone(await hydrating);
}

export function preferencesSnapshot(): Preferences {
	return snapshot;
}

export function preferencesLoaded(): boolean {
	return loaded;
}

export async function hydratePreferences(): Promise<void> {
	await getPreferences();
}

export async function setPreferences(
	newValues: Partial<Preferences>,
): Promise<void> {
	await enqueueWrite(async () => {
		const oldValues = await getPreferences();
		const preferences = preferencesSchema.parse({
			...oldValues,
			...newValues,
		});
		await writeAppDataFileAtomic({
			path: "preferences.data",
			content: encode(preferences),
		});
		publish(preferences);
	});
}

async function resetToDefaults(): Promise<void> {
	await enqueueWrite(async () => {
		const preferences = preferencesSchema.parse({});
		await writeAppDataFileAtomic({
			path: "preferences.data",
			content: encode(preferences),
		});
		publish(preferences);
	});
	window.location.reload();
}

const accountPreferenceKeys = [
	"autoUpdateLocation",
	"geohash",
	"gridSearchFilters",
] as const;

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
	return a.length === b.length && a.every((byte, index) => byte === b[index]);
}

export async function clearAccountPreferences(): Promise<void> {
	await enqueueWrite(async () => {
		const kept: Partial<Preferences> = { ...(await getPreferences()) };
		for (const key of accountPreferenceKeys) delete kept[key];
		const preferences = preferencesSchema.parse(kept);
		publish(preferences);
		const encoded = encode(preferences);
		if (bytesEqual(encoded, encode(preferencesSchema.parse({})))) {
			await removeAppDataFile("preferences.data");
		} else {
			await writeAppDataFileAtomic({
				path: "preferences.data",
				content: encoded,
			});
		}
	});
}
