import type { enExtra2 } from "./en.extra2";

// Textos de la cuarta tanda: ajustes rápidos, franja de favoritos, orden del buzón, columnas y voz.
export const euExtra2: Record<keyof typeof enExtra2, string> = {
	"gridColumns.title": "Zutabe kopurua",
	"gridColumns.hint":
		"Aukeratu zenbat txartel sartzen diren errenkada bakoitzean zabalerak erabaki beharrean. Beheko aurrebista zuzenean aldatzen da.",
	"gridColumns.value": "{n} zutabe",
	"quickSettings.title": "Ezarpen azkarrak",
	"quickSettings.invisible": "Ikusezin modua",
	"quickSettings.invisibleHint":
		"Aplikazioak atzeko planoan linean mantentzeari uzten dio; sareta arakatzen duzun bitartean soilik ikusten zaituzte.",
	"quickSettings.reduceMotion": "Murriztu animazioak",
	"quickSettings.reduceMotionHint":
		"Aplikazio osoko animazioak eta trantsizioak gutxitzen ditu.",
	"quickSettings.theme": "Gaia",
	"quickSettings.themeSystem": "Sistema",
	"quickSettings.themeDark": "Iluna",
	"quickSettings.themeLight": "Argia",
	"favoritesStrip.title": "Gogokoak linean orain",
	"favoritesStrip.setting": "Linean dauden gogokoen xerra",
	"favoritesStrip.settingHint":
		"Linean dauden gogokoak erakusten ditu saretaren gainean. Saretan kargatuta dagoen jendea soilik agertzen da.",
	"inboxSort.title": "Ordenatu txatak",
	"inboxSort.hint": "Finkatutako txatak beti goian geratzen dira.",
	"inboxSort.recent": "Berrienak lehenengo",
	"inboxSort.unread": "Irakurri gabeak lehenengo",
	"inboxSort.online": "Linean daudenak lehenengo",
	"chat.markUnread": "Markatu irakurri gabe gisa",
	"chat.markRead": "Kendu irakurri gabeko marka",
	"chat.markedUnread": "Irakurri gabe gisa markatuta",
	"voice.speed": "Erreprodukzio-abiadura {rate}x",
};
