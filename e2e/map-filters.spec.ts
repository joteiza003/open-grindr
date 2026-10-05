import { expect, type Page, test } from "@playwright/test";

import { ensureGridLocation, installTauriShim } from "./support/app";
import {
	installPersistentAppData,
	storedPreferences,
} from "./support/app-data";
import { installGeolocationShim } from "./support/geolocation";
import { commitSystemBack } from "./support/system-back";

/**
 * The demo answers for any profile id, always the same way. These four are
 * picked for what they are in it: two online, two offline, with these tribes.
 *   123456002 online,  Clean-Cut / Leather / Otter
 *   123456005 online,  Daddy / Discreet / Sober
 *   123456001 offline, Jock / Otter / Rugged
 *   123456003 offline, Clean-Cut / Leather / Rugged
 */
const PINS = [
	profilePin("ane", "Ane", 123456002, 52.55, 13.38),
	profilePin("jon", "Jon", 123456005, 52.5, 13.43),
	profilePin("mikel", "Mikel", 123456001, 52.53, 13.45),
	profilePin("amaia", "Amaia", 123456003, 52.49, 13.37),
];

function profilePin(
	id: string,
	name: string,
	profileId: number,
	latitude: number,
	longitude: number,
) {
	return {
		id,
		latitude,
		longitude,
		title: name,
		createdAt: "2026-01-01T00:00:00.000Z",
		profileId,
		mediaHash: "abcdef",
		displayName: name,
	};
}

const base64 = (value: unknown) =>
	Buffer.from(JSON.stringify(value), "utf8").toString("base64");

/** A one-pixel picture, so tiles and photos are answered without the network. */
const PICTURE = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
	"base64",
);

const pin = (page: Page, title: string) =>
	page.locator(`.leaflet-marker-icon[title="${title}"]`);
const card = (page: Page, title: string) =>
	page.getByRole("region", { name: title });
const panel = (page: Page) => page.getByRole("region", { name: "Filters" });
const filtersButton = (page: Page) =>
	page.getByRole("button", { name: "Filters" });
/** The pins of profiles, not the dot that marks the user's own position. */
const shownPins = (page: Page) =>
	page.locator(".leaflet-marker-icon:has(.og-pin--avatar)");

async function openMap(page: Page) {
	test.setTimeout(300_000);
	await page.route(
		/tile\.openstreetmap\.org|server\.arcgisonline\.com|api\.dicebear\.com/,
		(route) =>
			route.fulfill({
				status: 200,
				contentType: "image/png",
				body: PICTURE,
			}),
	);
	await installTauriShim(page, { platform: "android" });
	await installPersistentAppData(page);
	await installGeolocationShim(page);
	await page.goto("/");
	await page.locator("nav a").first().waitFor({ timeout: 120_000 });
	await ensureGridLocation(page);
	await page.evaluate(
		(pins) => {
			localStorage.setItem("e2e:appdata:mapElements", pins);
		},
		base64({ version: 1, markers: PINS }),
	);
	await page.goto("/map");
	await page.locator(".leaflet-container").waitFor({ timeout: 120_000 });
	await pin(page, "Ane").waitFor();
}

async function openFilters(page: Page) {
	await filtersButton(page).tap();
	await expect(panel(page)).toBeVisible();
}

test.describe("the card's Center button", () => {
	test("puts the pin in the middle of what the card leaves uncovered", async ({
		page,
	}) => {
		await openMap(page);
		await pin(page, "Ane").tap();
		await expect(card(page, "Ane")).toBeVisible();

		// Move the map away from the pin.
		const map = page.locator(".leaflet-container");
		const area = (await map.boundingBox())!;
		await page.mouse.move(area.x + 100, area.y + 150);
		await page.mouse.down();
		await page.mouse.move(area.x + 300, area.y + 150, { steps: 6 });
		await page.mouse.up();

		await card(page, "Ane").getByRole("button", { name: "Center" }).tap();

		// The pin ends up halfway down the part of the map above the card.
		const cardBox = (await card(page, "Ane").boundingBox())!;
		const expectedY = area.y + (cardBox.y - area.y) / 2;
		const expectedX = area.x + area.width / 2;
		await expect
			.poll(async () => {
				const box = (await pin(page, "Ane").boundingBox())!;
				return Math.hypot(
					box.x + box.width / 2 - expectedX,
					box.y + box.height / 2 - expectedY,
				);
			})
			.toBeLessThan(20);
	});
});

test.describe("profiles that are online", () => {
	test("have a green outline on the map and on their card", async ({
		page,
	}) => {
		await openMap(page);

		await expect(page.locator(".og-pin--avatar.is-online")).toHaveCount(2);
		await expect(pin(page, "Ane").locator(".is-online")).toHaveCount(1);
		await expect(pin(page, "Jon").locator(".is-online")).toHaveCount(1);
		await expect(pin(page, "Mikel").locator(".is-online")).toHaveCount(0);

		await pin(page, "Ane").tap();
		await expect(card(page, "Ane")).toBeVisible();
		await expect(card(page, "Ane").locator(".ring-green-500")).toHaveCount(
			1,
		);
		await expect(card(page, "Ane").getByText("Online")).toBeAttached();

		await card(page, "Ane").getByRole("button", { name: "Close" }).tap();
		await pin(page, "Mikel").tap();
		await expect(card(page, "Mikel")).toBeVisible();
		await expect(
			card(page, "Mikel").locator(".ring-green-500"),
		).toHaveCount(0);
	});
});

test.describe("filters", () => {
	test("the online filter keeps the online profiles, and clearing brings the rest back", async ({
		page,
	}) => {
		await openMap(page);
		await expect(shownPins(page)).toHaveCount(4);

		await openFilters(page);
		await panel(page).getByRole("checkbox", { name: "Online" }).click();

		await expect(shownPins(page)).toHaveCount(2);
		await expect(pin(page, "Ane")).toBeAttached();
		await expect(pin(page, "Jon")).toBeAttached();
		await expect(pin(page, "Mikel")).toHaveCount(0);
		await expect(filtersButton(page)).toContainText("1");

		await panel(page).getByRole("button", { name: "Close" }).tap();
		await expect(page.getByText("Showing 2 of 4")).toBeVisible();

		await page.getByRole("button", { name: "Clear" }).tap();
		await expect(shownPins(page)).toHaveCount(4);
		await expect(page.getByText("Showing 2 of 4")).toBeHidden();
	});

	test("a filter on tribes looks at the whole profile", async ({ page }) => {
		await openMap(page);

		await openFilters(page);
		await panel(page)
			.getByRole("checkbox", { name: /Tribes/ })
			.click();
		await panel(page).getByText("Leather", { exact: true }).click();

		// Ane and Amaia are Leather; Jon and Mikel are not.
		await expect(shownPins(page)).toHaveCount(2);
		await expect(pin(page, "Ane")).toBeAttached();
		await expect(pin(page, "Amaia")).toBeAttached();
	});

	test("both kinds together: online Leather profiles only", async ({
		page,
	}) => {
		await openMap(page);

		await openFilters(page);
		await panel(page).getByRole("checkbox", { name: "Online" }).click();
		await panel(page)
			.getByRole("checkbox", { name: /Tribes/ })
			.click();
		await panel(page).getByText("Leather", { exact: true }).click();

		await expect(shownPins(page)).toHaveCount(1);
		await expect(pin(page, "Ane")).toBeAttached();
	});

	test("the list shows what matches, says how much is hidden and offers no delete-all", async ({
		page,
	}) => {
		await openMap(page);
		await openFilters(page);
		await panel(page).getByRole("checkbox", { name: "Online" }).click();
		await panel(page).getByRole("button", { name: "Close" }).tap();

		await page.getByRole("button", { name: "Saved items" }).tap();
		const list = page.getByRole("region", { name: "Saved items" });

		await expect(list.getByRole("button", { name: "Ane" })).toBeVisible();
		await expect(list.getByRole("button", { name: "Mikel" })).toHaveCount(
			0,
		);
		await expect(list.getByText("2 hidden by the filters")).toBeVisible();
		await expect(
			list.getByRole("button", { name: "Delete all" }),
		).toHaveCount(0);
	});

	test("are remembered, and are not the filters of the browse screen", async ({
		page,
	}) => {
		await openMap(page);
		await openFilters(page);
		await panel(page).getByRole("checkbox", { name: "Online" }).click();
		await expect
			.poll(async () => {
				const stored = await storedPreferences(page);
				return (
					stored?.mapFilters as { isOnline?: boolean } | undefined
				)?.isOnline;
			})
			.toBe(true);

		const stored = await storedPreferences(page);
		expect(
			(stored?.gridSearchFilters as { isOnline?: boolean } | undefined)
				?.isOnline ?? false,
		).toBe(false);

		await page.goto("/map");
		await page.locator(".leaflet-container").waitFor({ timeout: 120_000 });

		await expect(filtersButton(page)).toContainText("1");
		await expect(page.getByText(/Showing 2 of 4/)).toBeVisible();
		await expect(shownPins(page)).toHaveCount(2);
	});

	test("the system back closes the filters first", async ({ page }) => {
		await openMap(page);
		await openFilters(page);

		expect(await commitSystemBack(page)).toBe(false);

		await expect(panel(page)).toBeHidden();
		await expect(page.locator(".leaflet-container")).toBeVisible();
	});
});
