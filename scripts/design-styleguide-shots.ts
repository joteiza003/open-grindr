/**
 * Captura la guía visual (design/dist/index.html) en claro y oscuro.
 *
 *   bun run design/styleguide  →  build + capturas
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PAGE = pathToFileURL(path.join(ROOT, "design", "dist", "index.html")).href;
const OUT = path.join(ROOT, "design", "captures", "styleguide");

const browser = await chromium.launch({
	args: ["--allow-file-access-from-files"],
});
try {
	for (const theme of ["dark", "light"] as const) {
		const context = await browser.newContext({
			viewport: { width: 1280, height: 1000 },
			deviceScaleFactor: 2,
			colorScheme: theme,
		});
		const page = await context.newPage();
		await page.goto(PAGE);
		await page.evaluate((value) => {
			document.documentElement.dataset.theme = value;
			document.body.classList.toggle("dark", value !== "light");
		}, theme);
		await page.evaluate(() => document.fonts.ready);
		await page.waitForTimeout(300);
		const file = path.join(OUT, `styleguide-${theme}.png`);
		await page.screenshot({ path: file, fullPage: true });
		console.log(`ok ${file}`);

		// Recortes por sección (revisión cómoda: la página completa es muy alta)
		for (const section of await page.locator("section.sg-section").all()) {
			const id = await section.getAttribute("id");
			if (!id) continue;
			await section.screenshot({
				path: path.join(OUT, `styleguide-${theme}-${id}.png`),
			});
		}
		await context.close();
	}
} finally {
	await browser.close();
}
