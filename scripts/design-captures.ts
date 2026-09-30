/**
 * Capturas de pantalla para el rediseño de la interfaz (guía visual antes/después).
 *
 * Usa el modo demo (mismo shim de Tauri y mismo servidor que el pipeline de
 * capturas de tienda) y el primado que usan los e2e: `installGpsHarness` +
 * `ensureGridLocation`. No toca la lógica de la app: solo navega y fotografía.
 *
 * Uso:
 *   bun scripts/design-captures.ts --label before
 *   bun scripts/design-captures.ts --label after --theme both --display both
 *   bun scripts/design-captures.ts --label before --only browse,chat-list
 *
 * El progreso se escribe también en design/.tmp/capture-<label>.log
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Browser, type Page, chromium } from "@playwright/test";

import { phoneDisplay } from "../scripts/store-screenshots/display";
import {
	forwardOnlyDevServerErrors,
	startDemoServer,
} from "../scripts/store-screenshots/demo-server";
import { freezeClockOnEveryLoad } from "../scripts/store-screenshots/clock";
import {
	ensureGridLocation,
	GRID_READY_SELECTOR,
	installTauriShim,
} from "../e2e/support/app";
import { installGeolocationShim } from "../e2e/support/geolocation";
import { installPersistentAppData } from "../e2e/support/app-data";
import playwrightConfig from "../playwright.config";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT_ROOT = path.join(REPO_ROOT, "design", "captures");
const LOG_DIR = path.join(REPO_ROOT, "design", ".tmp");
const STEP_TIMEOUT_MS = 60_000;

type Theme = "dark" | "light";
type Display = "phone" | "desktop";

type Scene = {
	name: string;
	path?: string;
	ready?: string;
	/** Navegación propia (para pantallas que requieren un paso previo). */
	open?: (page: Page) => Promise<void>;
};

const SCENES: Scene[] = [
	{ name: "browse", path: "/", ready: GRID_READY_SELECTOR },
	{ name: "right-now", path: "/right-now" },
	{ name: "interest-taps", path: "/interest/taps" },
	{ name: "interest-views", path: "/interest/views" },
	{
		name: "profile",
		open: async (page) => {
			await page.goto("/profile/100006", { timeout: STEP_TIMEOUT_MS });
			await page
				.locator('[data-slot="profile-pane"]')
				.first()
				.waitFor({ timeout: STEP_TIMEOUT_MS });
			// Baja al final: así se ve si el contenido despeja la barra inferior fija.
			await page.evaluate(() => {
				const scroller = document.querySelector<HTMLElement>(
					'[data-slot="profile-pane"] .overflow-y-auto',
				);
				if (scroller) scroller.scrollTop = scroller.scrollHeight;
			});
		},
	},
	{ name: "chat-list", path: "/chat", ready: 'a[href^="/chat/"]' },
	{
		name: "conversation",
		open: async (page) => {
			await page.goto("/chat", { timeout: STEP_TIMEOUT_MS });
			const rows = page.locator('a[href^="/chat/"]:visible');
			await rows.nth(1).waitFor({ timeout: 120_000 });
			const href = await rows.nth(1).getAttribute("href");
			await page.locator(`a[href="${href}"]:visible`).click();
			await page
				.locator('[role="article"]')
				.first()
				.waitFor({ timeout: STEP_TIMEOUT_MS });
		},
	},
	{
		name: "browse-list",
		open: async (page) => {
			await page.goto("/", { timeout: STEP_TIMEOUT_MS });
			await page.getByRole("button", { name: "List" }).click();
			await page
				.locator('[data-slot="grid-list"] a')
				.first()
				.waitFor({ timeout: STEP_TIMEOUT_MS });
		},
	},
	{
		name: "browse-tinder",
		open: async (page) => {
			await page.goto("/", { timeout: STEP_TIMEOUT_MS });
			await page.getByRole("button", { name: "Discover" }).click();
			await page
				.locator('[data-slot="tinder-card"]')
				.waitFor({ timeout: STEP_TIMEOUT_MS });
		},
	},
	{
		name: "browse-age-filter",
		open: async (page) => {
			await page.goto("/", { timeout: STEP_TIMEOUT_MS });
			await page.getByRole("button", { name: "Grid" }).click();
			await page.getByRole("button", { name: "Age" }).first().click();
			await page
				.getByLabel("Minimum age")
				.first()
				.waitFor({ timeout: STEP_TIMEOUT_MS });
		},
	},
	{
		name: "conversation-discreet",
		open: async (page) => {
			await page.goto("/settings", { timeout: STEP_TIMEOUT_MS });
			await page.getByRole("switch", { name: "Discreet mode" }).click();
			await page.goto("/chat", { timeout: STEP_TIMEOUT_MS });
			const rows = page.locator('a[href^="/chat/"]:visible');
			await rows.nth(1).waitFor({ timeout: 120_000 });
			const href = await rows.nth(1).getAttribute("href");
			await page.locator(`a[href="${href}"]:visible`).click();
			await page
				.locator('[role="article"]')
				.first()
				.waitFor({ timeout: STEP_TIMEOUT_MS });
		},
	},
	{ name: "map", path: "/map", ready: ".leaflet-container" },
	{ name: "albums", path: "/albums" },
	{ name: "auth-sign-in", path: "/auth/sign-in" },
	{ name: "onboarding", path: "/onboarding" },
	{ name: "settings", path: "/settings" },
	{ name: "settings-profile", path: "/settings/profile" },
	{ name: "settings-account", path: "/settings/account" },
	{ name: "settings-appearance", path: "/settings/appearance" },
	{ name: "settings-phrases", path: "/settings/phrases" },
	{ name: "settings-translation", path: "/settings/translation" },
	{ name: "settings-app", path: "/settings/app" },
];

const DISPLAYS: Record<Display, Record<string, unknown>> = {
	phone: { ...phoneDisplay, isMobile: true, hasTouch: true },
	desktop: {
		viewport: { width: 1366, height: 900 },
		deviceScaleFactor: 2,
		isMobile: false,
		hasTouch: false,
	},
};

let logFile = "";

function log(message: string): void {
	console.log(message);
	if (logFile) appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`);
}

function arg(name: string, fallback: string): string {
	const index = process.argv.indexOf(`--${name}`);
	const value = index === -1 ? undefined : process.argv[index + 1];
	return value ?? fallback;
}

function list<T extends string>(
	raw: string,
	allowed: readonly T[],
	fallback: T[],
): T[] {
	if (raw === "both" || raw === "all") return [...allowed];
	const picked = raw
		.split(",")
		.map((value) => value.trim())
		.filter((value): value is T =>
			(allowed as readonly string[]).includes(value),
		);
	return picked.length > 0 ? picked : fallback;
}

async function gpuCompositing(browser: Browser): Promise<string> {
	const session = await browser.newBrowserCDPSession();
	const { gpu } = await session.send("SystemInfo.getInfo");
	await session.detach();
	return gpu.featureStatus?.gpu_compositing ?? "unknown";
}

/** applyAppearance() solo escribe estos atributos en la raíz del documento. */
async function forceTheme(page: Page, theme: Theme): Promise<void> {
	if (theme === "dark") return;
	await page.evaluate(() => {
		document.documentElement.dataset.theme = "light";
		document.body.classList.remove("dark");
	});
	await page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	);
}

async function prime(page: Page): Promise<void> {
	await freezeClockOnEveryLoad(page);
	await installTauriShim(page, { platform: "android" });
	await installPersistentAppData(page);
	await installGeolocationShim(page);
	await page.goto("/", { timeout: STEP_TIMEOUT_MS });
	await page
		.locator("nav a")
		.first()
		.waitFor({ timeout: 120_000 });
	await ensureGridLocation(page);
}

/**
 * Asentamiento propio para capturas: espera red, tipografías y dos fotogramas.
 * No aplica los chequeos del pipeline de tienda (badge de interés, avisos),
 * que son contratos de esas capturas y no de una revisión de diseño.
 */
async function settleForCapture(page: Page): Promise<void> {
	await page.waitForLoadState("networkidle").catch(() => undefined);
	await page.evaluate(() => document.fonts.ready);
	// Las filas de la bandeja se montan con un fundido progresivo: esperar a
	// que no quede ninguna animación finita en marcha evita capturarlas a medias.
	await page
		.waitForFunction(
			() =>
				!document
					.getAnimations()
					.some(
						(animation) =>
							animation.playState === "running" &&
							animation.effect?.getComputedTiming().iterations !==
								Infinity,
					),
			undefined,
			{ timeout: 15_000 },
		)
		.catch(() => undefined);
	await page.evaluate(
		() =>
			new Promise((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(resolve)),
			),
	);
}

async function captureScene({
	page,
	scene,
	file,
	theme,
}: {
	page: Page;
	scene: Scene;
	file: string;
	theme: Theme;
}): Promise<string | null> {
	try {
		if (scene.open) {
			await scene.open(page);
		} else {
			await page.goto(scene.path ?? "/", { timeout: STEP_TIMEOUT_MS });
			if (scene.ready) {
				await page
					.locator(scene.ready)
					.first()
					.waitFor({ timeout: STEP_TIMEOUT_MS });
			}
		}
		await settleForCapture(page);
		await forceTheme(page, theme);
		await page.screenshot({ path: file, timeout: STEP_TIMEOUT_MS });
		return null;
	} catch (error) {
		return error instanceof Error
			? (error.message.split("\n")[0] ?? "error")
			: String(error);
	}
}

async function main(): Promise<void> {
	const label = arg("label", "before");
	const themes = list<Theme>(arg("theme", "dark"), ["dark", "light"], ["dark"]);
	const displays = list<Display>(arg("display", "phone"), ["phone", "desktop"], [
		"phone",
	]);
	const only = arg("only", "");
	const externalBaseUrl = arg("base-url", "");
	const scenes =
		only === ""
			? SCENES
			: SCENES.filter((scene) => only.split(",").includes(scene.name));

	mkdirSync(LOG_DIR, { recursive: true });
	logFile = path.join(LOG_DIR, `capture-${label}.log`);
	log(`inicio: label=${label} themes=${themes} displays=${displays} escenas=${scenes.length}`);

	// Con --base-url se reutiliza un servidor de demo ya levantado (útil cuando
	// otro proceso del workspace puede matar los procesos hijo).
	const server = externalBaseUrl ? null : await startDemoServer();
	const baseURL = externalBaseUrl || server?.baseURL || "";
	log(`servidor demo en ${baseURL}${server ? "" : " (externo)"}`);

	const browser = await chromium.launch({
		...(playwrightConfig.use?.launchOptions as object),
		args: [
			...((playwrightConfig.use?.launchOptions?.args as string[]) ?? []),
			"--use-angle=swiftshader",
		],
	});

	const compositing = await gpuCompositing(browser);
	log(`gpu_compositing: ${compositing}`);
	if (compositing !== "enabled") {
		log("AVISO: composición por software; los desenfoques pueden no ser fieles.");
	}

	const failures: string[] = [];
	try {
		for (const display of displays) {
			for (const theme of themes) {
				const context = await browser.newContext({
					baseURL,
					...DISPLAYS[display],
					reducedMotion: "reduce",
					colorScheme: theme,
					locale: "en-US",
					timezoneId: "UTC",
				});
				context.setDefaultTimeout(STEP_TIMEOUT_MS);
				context.setDefaultNavigationTimeout(STEP_TIMEOUT_MS);
				await forwardOnlyDevServerErrors({ context, baseURL });
				const page = await context.newPage();

				log(`primando ${theme}/${display}…`);
				await prime(page);
				log(`primado ${theme}/${display}: ok`);

				const dir = path.join(OUT_ROOT, label, theme, display);
				await mkdir(dir, { recursive: true });
				for (const scene of scenes) {
					const file = path.join(dir, `${scene.name}.png`);
					const failure = await captureScene({ page, scene, file, theme });
					if (failure) {
						failures.push(`${theme}/${display}/${scene.name}: ${failure}`);
						log(`  x ${theme}/${display}/${scene.name}: ${failure}`);
						continue;
					}
					log(`  ok ${theme}/${display}/${scene.name}`);
				}
				await context.close();
			}
		}
	} finally {
		await browser.close();
		server?.stop();
	}

	log(`capturas en design/captures/${label}`);
	if (failures.length > 0) {
		log(`escenas con error: ${failures.length}`);
		for (const failure of failures) log(`  - ${failure}`);
		process.exitCode = 1;
	}
	log("fin");
}

await main();
