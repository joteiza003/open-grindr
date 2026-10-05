// Pantalla del mapa: actualizar posiciones, vista satélite, errores al guardar,
// pantalla de fallo y panel de diagnóstico oculto.
export const esMap = {
	"map.refreshAll": "Actualizar posiciones",
	"map.refreshAllTitle": "Actualizar las posiciones de los pines de perfiles",
	"map.refreshOne": "Actualizar",
	"map.refreshProgress": "Actualizando {n}/{total}…",
	"map.refreshing": "Actualizando…",
	"map.refreshFailed": "No se pudo actualizar la posición",
	"map.refreshPartial": "Se actualizaron {done} de {total} posiciones",
	"map.saveFailed": "No se pudo guardar el cambio en este dispositivo",
	"map.tilesFailing": "El mapa no carga. Revisa tu conexión.",
	"map.satellite": "Vista satélite",
	"map.errorTitle": "El mapa ha tenido un problema",
	"map.retry": "Reintentar",
	"map.traceTitle": "Diagnóstico del mapa",
	"map.traceHint":
		"No se guarda ni se envía nada. Si el mapa falla, copia esto y compártelo.",
	"map.traceCopy": "Copiar informe",
	"map.traceReload": "Recargar el mapa",
	"map.traceHome": "Volver al inicio",
	"map.traceCopied": "Informe copiado",
	"map.traceCopyFailed": "No se pudo copiar el informe",
} as const;
