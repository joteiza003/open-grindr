import { describe, expect, it } from "vitest";

import { en } from "./en";
import { es } from "./es";
import { eu } from "./eu";

describe("i18n catalogs", () => {
	it("keeps the same keys in Castellano and Euskera", () => {
		const keys = Object.keys(en).sort();
		expect(Object.keys(es).sort()).toEqual(keys);
		expect(Object.keys(eu).sort()).toEqual(keys);
	});

	it("translates the inbox label", () => {
		expect(es["nav.inbox"]).toBe("Chats");
		expect(eu["nav.inbox"]).toBe("Txatak");
	});
});
