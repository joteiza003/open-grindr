import type { enMore } from "./en.more";

// Textos de la segunda tanda: Right Now, notificaciones, barra, búsqueda, gestos y mapa.
export const esMore: Record<keyof typeof enMore, string> = {
	"map.deleteAll": "Borrar todos",
	"map.deleteAllTitle": "¿Borrarlos todos?",
	"map.deleteAllLocationsBody":
		"Se quitarán {n} ubicaciones compartidas de este dispositivo. No se puede deshacer.",
	"map.deleteAllMarkersBody":
		"Se quitarán {n} marcadores del mapa y de este dispositivo. No se puede deshacer.",
	"profile.summary": "Resumen",
	"profile.summaryAge": "{n} años",
	"profile.summaryLooking": "Busca",
	"indicators.favorite": "Mostrar estrella de favorito",
	"indicators.favoriteHint":
		"Una estrella en las tarjetas de quien guardaste como favorito.",
	"indicators.chat": "Mostrar insignia de chat reciente",
	"indicators.chatHint":
		"Una burbuja en quien hablaste en las últimas 24 horas.",
	"indicators.legend": "Qué significa cada icono",
	"indicators.legendOnline": "Conectado ahora",
	"indicators.legendVisiting": "De visita: lejos de su sitio habitual",
	"indicators.legendFavorite": "Favorito",
	"indicators.legendChat": "Chat en las últimas 24 horas",
	"chat.swipe.title": "Gestos al deslizar",
	"chat.swipe.hint":
		"Qué pasa al deslizar una conversación en la lista de chats (solo pantallas táctiles).",
	"chat.swipe.right": "Deslizar a la derecha",
	"chat.swipe.left": "Deslizar a la izquierda",
	"chat.swipe.pin": "Fijar / desfijar",
	"chat.swipe.mute": "Silenciar / activar",
	"chat.swipe.delete": "Eliminar",
	"chat.swipe.none": "Nada",
	"search.title": "Buscar en los chats",
	"search.titleChat": "Buscar en este chat",
	"search.scope":
		"Busca en los mensajes ya cargados en este dispositivo (los chats que abriste en esta sesión) y en el último mensaje de los demás chats. No consulta al servidor.",
	"search.placeholder": "Buscar mensajes",
	"search.kinds": "Tipo de mensaje",
	"search.kind.all": "Todo",
	"search.kind.text": "Texto",
	"search.kind.media": "Fotos y vídeos",
	"search.kind.link": "Enlaces",
	"search.kind.location": "Ubicaciones",
	"search.start": "Escribe algo o elige un tipo para empezar.",
	"search.none":
		"No se ha encontrado nada en lo que hay cargado en este dispositivo.",
	"search.unknownChat": "Conversación",
	"search.fromPreview": "último mensaje",
	"nav.rightNow": "Right Now",
	"nav.notifications": "Notificaciones",
	"rightNow.intro": "Quién tiene algo en marcha cerca de ti ahora mismo.",
	"rightNow.limits":
		"Aquí puedes leer y responder a las publicaciones de Right Now. Publicar la tuya todavía no está disponible en esta app, porque su interfaz con el servidor no está documentada.",
	"rightNow.refresh": "Actualizar",
	"rightNow.empty": "Nadie tiene una publicación de Right Now cerca",
	"rightNow.emptyHint":
		"Prueba de nuevo en unos minutos o desde otra ubicación.",
	"rightNow.sayHi": "Saludar",
	"rightNow.viewProfile": "Perfil",
	"rightNow.loadMore": "Cargar más",
	"rightNow.hiFailed": "No se pudo enviar el mensaje",
	"notifications.customize": "Personalizar",
	"notifications.unread": "Chats sin leer",
	"notifications.unreadNone": "Estás al día.",
	"notifications.checkNow": "Comprobar ahora",
	"notifications.filtersNone":
		"Guarda una búsqueda desde los filtros de la cuadrícula para ver aquí lo nuevo.",
	"notifications.week": "Tu semana",
	"notifications.seeAll": "Ver todo",
	"notifications.shortcuts": "Atajos",
	"notifications.map": "Mapa",
	"notifications.albums": "Mis álbumes",
	"navSettings.title": "Barra de navegación",
	"navSettings.tabs": "Pestañas",
	"navSettings.tabsHint":
		"Elige qué pestañas se ven y en qué orden: entre {min} y {max}. La barra es fija; si no hay sitio para los títulos, muestra solo los iconos.",
	"nav.map": "Mapa",
	"navSettings.moveUp": "Subir {name}",
	"navSettings.moveDown": "Bajar {name}",
	"navSettings.reset": "Restaurar pestañas por defecto",
	"navSettings.modules": "Panel de Notificaciones",
	"navSettings.modulesHint":
		"Elige los módulos que muestra la pestaña Notificaciones y su orden.",
	"navSettings.oneHand": "Modo una mano",
	"navSettings.oneHandHint":
		"Baja los controles de la cuadrícula (ubicación, filtros, vista) a la parte inferior, junto a la barra de navegación.",
};
