import { expect, type Page, test } from "@playwright/test";

import { ensureGridLocation, installTauriShim, pathname } from "./support/app";
import {
	installPersistentAppData,
	setAppDataWriteDelay,
} from "./support/app-data";
import { installGeolocationShim } from "./support/geolocation";
import { commitSystemBack } from "./support/system-back";

const PINS = [
	{
		id: "place-aaa",
		latitude: 52.52,
		longitude: 13.405,
		title: "Cafe",
		createdAt: "2026-01-01T00:00:00.000Z",
	},
	{
		id: "place-bbb",
		latitude: 52.5235,
		longitude: 13.412,
		title: "Ane",
		createdAt: "2026-01-02T00:00:00.000Z",
		profileId: 100001,
		mediaHash: "abcdef",
		displayName: "Ane",
	},
	{
		id: "place-ccc",
		latitude: 52.511,
		longitude: 13.39,
		title: "Beach",
		createdAt: "2026-01-03T00:00:00.000Z",
	},
];

const LOCATIONS = [
	{
		localId: "c1:m1",
		conversationId: "c1",
		senderId: 7,
		displayName: "Mikel",
		lat: 52.5155,
		lon: 13.4,
		receivedAt: 1_700_000_000_000,
	},
];

const base64 = (value: unknown) =>
	Buffer.from(JSON.stringify(value), "utf8").toString("base64");

const pin = (page: Page, title: string) =>
	page.locator(`.leaflet-marker-icon[title="${title}"]`);
const card = (page: Page, title: string) =>
	page.getByRole("region", { name: title });

async function openMap(page: Page) {
	test.setTimeout(300_000);
	await installTauriShim(page, { platform: "android" });
	await installPersistentAppData(page);
	await installGeolocationShim(page);
	await page.goto("/");
	await page.locator("nav a").first().waitFor({ timeout: 120_000 });
	await ensureGridLocation(page);

	await page.evaluate(
		([pins, locations]) => {
			localStorage.setItem("e2e:appdata:mapElements", pins!);
			localStorage.setItem("e2e:appdata:locationMapIndex", locations!);
		},
		[
			base64({ version: 1, markers: PINS }),
			base64({ version: 1, locations: LOCATIONS }),
		],
	);
	await page.goto("/map");
	await page.locator(".leaflet-container").waitFor({ timeout: 120_000 });
	await pin(page, "Beach").waitFor();
}

/** Going back reloads the page (the map was opened with a full load), so reading it can fail mid-navigation. */
async function hasLeftTheMap(page: Page): Promise<boolean> {
	try {
		return !(await pathname(page)).startsWith("/map");
	} catch {
		return false;
	}
}

const savedPinTitles = (page: Page) =>
	page.evaluate(() => {
		const raw = localStorage.getItem("e2e:appdata:mapElements");
		const file = JSON.parse(atob(raw ?? "e30=")) as {
			markers?: { title: string }[];
		};
		return file.markers?.map((marker) => marker.title) ?? [];
	});

test.describe("map screen", () => {
	test("a tapped pin opens its card, which can be closed again", async ({
		page,
	}) => {
		await openMap(page);

		await pin(page, "Beach").tap();
		await expect(card(page, "Beach")).toBeVisible();
		await card(page, "Beach").getByRole("button", { name: "Close" }).tap();
		await expect(card(page, "Beach")).toBeHidden();

		await pin(page, "Beach").tap();
		await expect(card(page, "Beach")).toBeVisible();
		await page
			.locator(".leaflet-container")
			.tap({ position: { x: 200, y: 330 } });
		await expect(card(page, "Beach")).toBeHidden();
	});

	test("deleting a pin asks first, and the card is gone at once", async ({
		page,
	}) => {
		await openMap(page);
		await pin(page, "Beach").tap();

		await card(page, "Beach").getByRole("button", { name: "Delete" }).tap();
		const confirm = page.getByRole("alertdialog");
		await expect(confirm).toBeVisible();
		await confirm.getByRole("button", { name: "Cancel" }).tap();
		await expect(confirm).toBeHidden();
		await expect(card(page, "Beach")).toBeVisible();

		await card(page, "Beach").getByRole("button", { name: "Delete" }).tap();
		await confirm.getByRole("button", { name: "Delete" }).tap();
		await expect(confirm).toBeHidden();
		await expect(card(page, "Beach")).toBeHidden();
		await expect(pin(page, "Beach")).toHaveCount(0);
		await expect.poll(() => savedPinTitles(page)).toEqual(["Cafe", "Ane"]);
	});

	test("everything still answers while storage never does", async ({
		page,
	}) => {
		await openMap(page);
		await setAppDataWriteDelay(page, 3_600_000);

		await pin(page, "Beach").tap();
		await card(page, "Beach").getByRole("button", { name: "Delete" }).tap();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Delete" })
			.tap();

		await expect(pin(page, "Beach")).toHaveCount(0);
		await page.getByRole("button", { name: "Saved items" }).tap();
		const list = page.getByRole("region", { name: "Saved items" });
		await expect(list.getByText("Cafe")).toBeVisible();
		await expect(list.getByText("Beach")).toHaveCount(0);

		await page.getByRole("button", { name: "Back" }).tap();
		await expect.poll(() => hasLeftTheMap(page)).toBe(true);
	});

	test("the back button leaves the map even with a card open", async ({
		page,
	}) => {
		await openMap(page);
		await pin(page, "Beach").tap();
		await expect(card(page, "Beach")).toBeVisible();

		await page.getByRole("button", { name: "Back" }).tap();

		await expect.poll(() => hasLeftTheMap(page)).toBe(true);
	});

	test("the system back gesture closes the card first, then leaves", async ({
		page,
	}) => {
		await openMap(page);
		await pin(page, "Beach").tap();
		await expect(card(page, "Beach")).toBeVisible();

		expect(await commitSystemBack(page)).toBe(false);
		await expect(card(page, "Beach")).toBeHidden();
		expect(await pathname(page)).toBe("/map");

		await commitSystemBack(page);
		await expect.poll(() => hasLeftTheMap(page)).toBe(true);
	});

	test("the list opens a shared location, with directions and delete", async ({
		page,
	}) => {
		await openMap(page);

		await page.getByRole("button", { name: "Saved items" }).tap();
		const list = page.getByRole("region", { name: "Saved items" });
		await list.getByRole("button", { name: "Mikel" }).tap();

		await expect(card(page, "Mikel")).toBeVisible();
		await expect(
			card(page, "Mikel").getByRole("button", { name: "Directions" }),
		).toBeVisible();

		await card(page, "Mikel").getByRole("button", { name: "Delete" }).tap();
		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Delete" })
			.tap();
		await expect(card(page, "Mikel")).toBeHidden();
		await expect(pin(page, "Mikel")).toHaveCount(0);
	});

	test("a profile pin offers the profile and an update, a plain pin does not", async ({
		page,
	}) => {
		await openMap(page);
		await page.getByRole("button", { name: "Zoom in" }).tap();
		await page.getByRole("button", { name: "Zoom in" }).tap();
		await pin(page, "Ane").waitFor();

		await pin(page, "Ane").tap();
		await expect(
			card(page, "Ane").getByRole("button", { name: "View profile" }),
		).toBeVisible();
		await expect(
			card(page, "Ane").getByRole("button", { name: "Update" }),
		).toBeVisible();
		await card(page, "Ane").getByRole("button", { name: "Close" }).tap();

		await pin(page, "Cafe").tap();
		await expect(
			card(page, "Cafe").getByRole("button", { name: "Directions" }),
		).toBeVisible();
		await expect(
			card(page, "Cafe").getByRole("button", { name: "Update" }),
		).toHaveCount(0);
	});

	test("it stays tappable even if a dialog elsewhere left pointer-events: none on the body", async ({
		page,
	}) => {
		await openMap(page);
		await page.evaluate(() => {
			document.body.style.pointerEvents = "none";
		});

		await pin(page, "Beach").tap();
		await card(page, "Beach").getByRole("button", { name: "Close" }).tap();
		await expect(card(page, "Beach")).toBeHidden();
		await page.getByRole("button", { name: "Saved items" }).tap();
		await expect(
			page.getByRole("region", { name: "Saved items" }),
		).toBeVisible();
	});

	test("pressing and holding the title shows diagnostics that recorded the taps", async ({
		page,
	}) => {
		await openMap(page);
		await pin(page, "Beach").tap();
		await expect(card(page, "Beach")).toBeVisible();

		await page
			.getByRole("heading", { name: "Map" })
			.dispatchEvent("pointerdown");
		const diagnostics = page.getByRole("region", {
			name: "Map diagnostics",
		});
		await expect(diagnostics).toBeVisible({ timeout: 5_000 });

		const report = diagnostics.locator("pre");
		await expect(report).toContainText("map screen opened");
		await expect(report).toContainText("map started");
		await expect(report).toContainText("touch on");
		await expect(report).toContainText("panel: pin");
		await expect(report).not.toContainText("main thread was blocked");

		await diagnostics.getByRole("button", { name: "Close" }).tap();
		await expect(diagnostics).toBeHidden();
	});

	test("it says when the map tiles cannot load, and the pins keep working", async ({
		page,
	}) => {
		await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());
		await openMap(page);

		await expect(page.getByText("The map isn't loading")).toBeVisible();
		await pin(page, "Beach").tap();
		await expect(card(page, "Beach")).toBeVisible();
	});
});
