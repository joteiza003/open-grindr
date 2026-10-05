import type { enExtra } from "./en.extra";

// Textos de la tercera tanda: marcas de leído, silencios, listas, novedades, chat y álbumes.
export const euExtra: Record<keyof typeof enExtra, string> = {
	"nav.badgeSr": "berri",
	"presence.label": "Ikusezin modua",
	"presence.visibleTitle":
		"Linean agertzen zara aplikazioa irekita dagoela. Sakatu ikusezin izateko.",
	"presence.invisibleTitle":
		"Ikusezin: sareta arakatzen duzun bitartean soilik ikusten zaituzte. Sakatu berriro linean agertzeko.",
	"presence.invisibleOn":
		"Ikusezin modua aktibatuta. Aplikazioak ez zaitu atzeko planoan linean mantentzen.",
	"presence.visibleOn": "Linean agertzen zara aplikazioa irekita dagoela.",
	"presence.failed": "Ezin izan da zure ikusgarritasuna aldatu",
	"quick.title": "Ekintza azkarrak",
	"quick.favorite": "Gogokoa",
	"quick.unfavorite": "Kendu gogokoa",
	"quick.mute": "Isildu",
	"quick.unmute": "Aktibatu txata",
	"quick.hide": "Ezkutatu denbora batez",
	"quick.unhide": "Erakutsi berriro",
	"quick.block": "Blokeatu",
	"quick.blockTitle": "Pertsona hau blokeatu?",
	"quick.blockBody": "Ezingo zaitu ikusi ez idatzi.",
	"quick.favoriteFailed": "Ezin izan dira gogokoak eguneratu",
	"quick.blockFailed": "Ezin izan da blokeatu",
	"silence.muteTitle": "Isildu txat hau…",
	"silence.muteHint":
		"Txat honen jakinarazpenak itzali egiten dira eta berez aktibatzen dira aplikazioa irekita dagoenean.",
	"silence.hideTitle": "Ezkutatu saretatik…",
	"silence.hideHint":
		"Gailu honetan soilik: pertsona ez da blokeatzen eta berez itzultzen da. Ez zaio abisurik ematen.",
	"silence.d1h": "Ordu 1",
	"silence.d8h": "8 ordu",
	"silence.d24h": "24 ordu",
	"silence.d7d": "7 egun",
	"silence.mutedUntil": "{when} arte isilduta",
	"silence.hiddenUntil": "{when} arte ezkutatuta",
	"silence.failed": "Ezin izan da aldatu",
	"silence.title": "Aldi baterako isiltzeak",
	"silence.none": "Une honetan inor ez dago isilduta edo ezkutatuta.",
	"silence.person": "{id}. profila",
	"silence.kindMute": "Txata isilduta",
	"silence.kindHide": "Ezkutatuta",
	"silence.reactivate": "Berriz aktibatu",
	"whatsNew.title": "Berritasunak",
	"whatsNew.intro": "Azken aldaketak, bakoitzerako lasterbide batekin.",
	"whatsNew.open": "Ireki",
	"whatsNew.close": "Ulertuta",
	"whatsNew.nav.title": "Zure nabigazio-barra",
	"whatsNew.nav.body":
		"Aukeratu gehienez 5 fitxa eta haien ordena. Izenburuak berez ezkutatzen dira lekurik ez badago.",
	"whatsNew.notifications.title": "Jakinarazpenak fitxa",
	"whatsNew.notifications.body":
		"Irakurri gabeko txatak, gordetako iragazkien berriak eta zure astea, toki batean.",
	"whatsNew.rightNow.title": "Right Now",
	"whatsNew.rightNow.body":
		"Ikusi nork daukan zerbait martxan ondoan eta agurtu. Zurea argitaratzea oraindik ez dago eskuragarri.",
	"whatsNew.search.title": "Bilatu zure txatetan",
	"whatsNew.search.body":
		"Bilatu zure gailuan dauden mezuetan, testuaren, argazkien, estuken edo kokalekuen arabera.",
	"whatsNew.ticks.title": "Irakurketa-markak",
	"whatsNew.ticks.body":
		"Marka bat bidaltzean, bi marka urdin irakurri dutenean.",
	"whatsNew.silence.title": "Isildu edo ezkutatu denbora batez",
	"whatsNew.silence.body":
		"Profil batetik, isildu txata edo ezkutatu pertsona ordu 1etik 7 egunera.",
	"whatsNew.invisible.title": "Ikusezin modua",
	"whatsNew.invisible.body":
		"Sareta-barrako botoi bat aplikazioak linean mantentzeari utz diezaion.",
	"whatsNew.map.title": "Mapa konponduta",
	"whatsNew.map.body":
		"Pinak eta gordetako lekuak ezabatzeak berriro funtzionatzen du, eta guztiak batera ezaba ditzakezu.",
	"lists.title": "Gogokoen zerrendak",
	"lists.localNote":
		"Zerrendak gailu honetan soilik daude. Grindrek ez daki ezer haien berri.",
	"lists.none":
		"Oraindik ez daukazu zerrendarik. Sortu bat jendea taldekatzeko.",
	"lists.newPlaceholder": "Zerrenda berriaren izena",
	"lists.create": "Sortu zerrenda",
	"lists.rename": "Zerrendaren izena",
	"lists.renameNamed": "Aldatu {name} izena",
	"lists.deleteNamed": "Ezabatu {name}",
	"lists.save": "Gorde",
	"lists.members": "{n} pertsona",
	"lists.empty": "Zerrenda hau hutsik dago. Gehitu jendea haien profiletik.",
	"lists.remove": "Kendu",
	"lists.deleteTitle": "Zerrenda hau ezabatu?",
	"lists.deleteBody":
		"Bertan dauden pertsonak ez dira ezabatzen edo blokeatzen, zerrenda bakarrik.",
	"lists.addTo": "Zerrendak",
	"lists.filter": "Iragazi zerrendaren arabera",
	"lists.filterHint": "Kargatuta dagoen jendea soilik erakusten da.",
	"lists.all": "Denak",
	"lists.failed": "Ezin izan dira zerrendak eguneratu",
	"lists.problem.emptyName": "Jarri izena zerrendari.",
	"lists.problem.duplicate": "Badaukazu izen hori duen zerrenda bat.",
	"lists.problem.tooMany": "{max} zerrenda arte izan ditzakezu.",
	"album.expiresIn": "{time} barru iraungitzen da",
	"album.expired": "Sarbidea iraungi da",
	"album.renew": "Berritu",
	"album.renewed": "Sarbidea berritu da",
	"album.renewFailed": "Ezin izan da sarbidea berritu",
	"weekly.title": "Zure astea laburbilduta",
	"weekly.dismiss": "Ezkutatu hurrengo astelehenera arte",
	"weekly.messages": "{sent} mezu bidali eta {received} jaso dituzu.",
	"weekly.replyRate":
		"Zuri idatzi dizuten txatetako {rate}ri erantzun diozu.",
	"weekly.topChat": "Gehien {name}ri idatzi diozu ({n} mezu).",
	"chat.typing": "idazten…",
	"chatSettings.title": "Txataren ezarpenak",
	"chatSettings.stats": "Erakutsi txat honen estatistikak",
	"chatSettings.statsHint":
		"Lehenespenez desaktibatuta. Gailu honetan kalkulatzen da hemen erregistratutako mezuekin.",
	"chatSettings.statsNone":
		"Oraindik ez dago txat honetako mezurik erregistratuta.",
	"chatSettings.startedByYou": "Zuk idatzi zenuen lehenengo {date}(a)n.",
	"chatSettings.startedByThem":
		"Pertsona horrek idatzi zuen lehenengo {date}(a)n.",
	"chatSettings.starred": "Nabarmendutako mezuak",
	"chatSettings.starredNone":
		"Luze sakatu edo egin klik eskuinekoa mezu batean eta aukeratu Nabarmendu hemen gordetzeko.",
	"chatSettings.starredMedia": "Argazkia, bideoa edo beste mezu bat",
	"chatSettings.star": "Nabarmendu",
	"chatSettings.unstar": "Kendu nabarmentzea",
	"chatSettings.starredBadge": "Nabarmendua",
};
