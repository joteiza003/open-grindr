import type { enExtra3 } from "./en.extra3";

// Textos de la tanda de álbumes: selección numerada, álbum local/real, límites, guardar fotos y almacenamiento.
export const euExtra3: Record<keyof typeof enExtra3, string> = {
	"albumsKit.saveLocal": "Gorde album lokal gisa",
	"albumsKit.saveLocalDone": "Album lokala gorde da",
	"albumsKit.createReal": "Sortu benetako albuma",
	"albumsKit.createRealDone": "Benetako albuma sortu da {count} argazkirekin",
	"albumsKit.createRealTrimmed":
		"Benetako albuma sortu da {total} argazkitik {count}rekin (zure kontuaren muga)",
	"albumsKit.noRoom": "Zure kontuaren benetako album-mugara iritsi zara.",
	"albumsKit.failed": "Ezin izan da albuma sortu",
	"albumsKit.defaultName": "Albuma {date}",
	"albumsKit.promote": "Bihurtu benetako album",
	"albumsKit.limits": "{maxAlbums} albumetatik {albums}",
	"albumsKit.savePhoto": "Gorde argazkia",
	"albumsKit.savedPhoto": "Argazkia zure liburutegian gorde da",
	"albumsKit.saveFailed": "Ezin izan da argazkia gorde",
	"albumsKit.storageTitle": "Biltegiratzea",
	"albumsKit.storageUsed": "{size} erabilita, gordetako {count} elementuk",
	"albumsKit.deleteContact": "Ezabatu {name}ren guztia",
	"albumsKit.deleteContactDone": "Ezabatuta",
	"albumsKit.export": "Esportatu karpeta batera",
	"albumsKit.exported": "Liburutegia esportatu da",
	"albumsKit.exportFailed": "Ezin izan da liburutegia esportatu",
	"greeting.title": "Karrusseleko super like-aren agurra",
	"greeting.messages": "Mezuak",
	"greeting.hint":
		"Mezu hauek ordena horretan bidaltzen dira karrusselean norbaiti super like ematean. Argazkiak mezuen ondoren doaz.",
	"greeting.messageN": "{n}. mezua",
	"greeting.add": "Gehitu mezua",
	"greeting.remove": "Kendu mezua",
	"greeting.restore": "Berrezarri lehenetsia",
	"greeting.photos": "Bidaliko diren argazkiak",
	"greeting.photosHint":
		"Aukeratu {max} arte. Sakatzen dituzun ordenan bidaltzen dira.",
};
