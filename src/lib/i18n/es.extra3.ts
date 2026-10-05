import type { enExtra3 } from "./en.extra3";

// Textos de la tanda de álbumes: selección numerada, álbum local/real, límites, guardar fotos y almacenamiento.
export const esExtra3: Record<keyof typeof enExtra3, string> = {
	"albumsKit.saveLocal": "Guardar como álbum local",
	"albumsKit.saveLocalDone": "Álbum local guardado",
	"albumsKit.createReal": "Crear álbum real",
	"albumsKit.createRealDone": "Álbum real creado con {count} fotos",
	"albumsKit.createRealTrimmed":
		"Álbum real creado con {count} de {total} fotos (límite de tu cuenta)",
	"albumsKit.noRoom":
		"Has alcanzado el límite de álbumes reales de tu cuenta.",
	"albumsKit.failed": "No se pudo crear el álbum",
	"albumsKit.defaultName": "Álbum {date}",
	"albumsKit.promote": "Convertir en álbum real",
	"albumsKit.limits": "{albums} de {maxAlbums} álbumes",
	"albumsKit.savePhoto": "Guardar foto",
	"albumsKit.savedPhoto": "Foto guardada en tu biblioteca",
	"albumsKit.saveFailed": "No se pudo guardar la foto",
	"albumsKit.storageTitle": "Almacenamiento",
	"albumsKit.storageUsed": "{size} usados por {count} elementos guardados",
	"albumsKit.deleteContact": "Borrar todo lo de {name}",
	"albumsKit.deleteContactDone": "Borrado",
	"albumsKit.export": "Exportar a una carpeta",
	"albumsKit.exported": "Biblioteca exportada",
	"albumsKit.exportFailed": "No se pudo exportar la biblioteca",
	"greeting.title": "Saludo del super like del carrusel",
	"greeting.messages": "Mensajes",
	"greeting.hint":
		"Estos mensajes se envían, en este orden, al hacer super like a alguien en el carrusel. Las fotos van después de los mensajes.",
	"greeting.messageN": "Mensaje {n}",
	"greeting.add": "Añadir mensaje",
	"greeting.remove": "Quitar mensaje",
	"greeting.restore": "Restaurar el saludo por defecto",
	"greeting.photos": "Fotos que se envían",
	"greeting.photosHint":
		"Elige hasta {max}. Se envían en el orden en que las pulsas.",
};
