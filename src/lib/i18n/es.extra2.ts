import type { enExtra2 } from "./en.extra2";

// Textos de la cuarta tanda: ajustes rápidos, franja de favoritos, orden del buzón, columnas y voz.
export const esExtra2: Record<keyof typeof enExtra2, string> = {
	"gridColumns.title": "Número de columnas",
	"gridColumns.hint":
		"Elige cuántas tarjetas caben en cada fila en vez de dejar que lo decida el ancho. La vista previa de abajo cambia en vivo.",
	"gridColumns.value": "{n} columnas",
	"quickSettings.title": "Ajustes rápidos",
	"quickSettings.invisible": "Modo invisible",
	"quickSettings.invisibleHint":
		"La app deja de mantenerte en línea en segundo plano; solo se te ve mientras exploras la cuadrícula.",
	"quickSettings.reduceMotion": "Reducir animaciones",
	"quickSettings.reduceMotionHint":
		"Minimiza las animaciones y transiciones de toda la app.",
	"quickSettings.theme": "Tema",
	"quickSettings.themeSystem": "Sistema",
	"quickSettings.themeDark": "Oscuro",
	"quickSettings.themeLight": "Claro",
	"favoritesStrip.title": "Favoritos en línea ahora",
	"favoritesStrip.setting": "Franja de favoritos en línea",
	"favoritesStrip.settingHint":
		"Muestra sobre la cuadrícula a los favoritos que están en línea. Solo aparece quien ya está cargado en la cuadrícula.",
	"inboxSort.title": "Ordenar chats",
	"inboxSort.hint": "Los chats fijados siempre se quedan arriba.",
	"inboxSort.recent": "Más recientes primero",
	"inboxSort.unread": "No leídos primero",
	"inboxSort.online": "En línea primero",
	"chat.markUnread": "Marcar como no leído",
	"chat.markRead": "Quitar marca de no leído",
	"chat.markedUnread": "Marcado como no leído",
	"voice.speed": "Velocidad de reproducción {rate}x",
};
