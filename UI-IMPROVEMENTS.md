# Mejoras de interfaz — Grindr +

Documento de seguimiento de la revisión de UI. Todo el trabajo se mantiene en
capas de presentación/experiencia/estado/preferencias — **nunca** en el motor
de conexión (auth, WebSocket, REST `grindr.rs`, identidad de dispositivo,
almacenamiento seguro, GridState, virtualización).

Prioridad: compatibilidad Grindr > estabilidad > integración con el core > UX >
funciones nuevas > optimización > estética.

---

## #1 — Marca: «Open Grind» → «Grindr +» ✅

Alcance elegido: **todo** el texto que nombra a esta app.

- [x] Título de ventana (Browse `<title>`) + `tauri.conf.json` (productName + window title)
- [x] Nombre de la app Android (`strings.xml`: app_name + main_activity_title → «Grindr +»)
- [x] Onboarding (encabezado, «añadir al menú de apps», error)
- [x] Ajustes → App → entrada al menú de aplicaciones
- [x] Aviso de verificación de edad
- [x] Aviso de bypass de entitlements
- [x] reCAPTCHA no soportado / mensaje de Facebook en sign-in
- [x] Mensajes del sistema de actualización (i18n en/es/eu + `error-copy.ts` + `update-checks.ts`)
- [x] Nombre del estilo por defecto (`appearance.styleDefault`)
- [x] Tests de updates actualizados a las nuevas cadenas (250+ verdes)

**Mantenido a propósito (identificador técnico / entidad externa / atribución legal):**

- URLs y hrefs (`opengrind.org`, `git.opengrind.org/...`).
- Claves de almacenamiento (`open-grind:app-data:`, `open-grind:backdrop-blur`) — renombrarlas huérfanaría datos guardados.
- Nombre propio de la app auxiliar «Open Grind Google OAuth app» (el usuario la localiza e instala por ese nombre).
- Autoridad de firma en mensajes OAuth («signed by Open Grind»).
- `publisher`/`copyright` = «Open Grind Governance» (atribución legal correcta).
- Etiquetas de enlaces en «Ajustes → Socials» (apuntan al proyecto FLOSS upstream).

> Si quieres que también renombre estos, dímelo y lo hago (aviso: los primeros dos romperían función/datos).

## #2 — Internacionalizar las funciones nuevas ✅

Se añadieron 29 claves nuevas a en/es/eu (`chat.*` de ubicación + bloque
`album.*`) y se reemplazaron los textos fijos por `t()`.

- [x] `LocationMessage` («Shared location», «View on map»)
- [x] `LocationConfirmDialog` (quick action) — título/cuerpo/cancelar/enviar/error
- [x] `ComposerLocationTab` (pestaña de adjuntos)
- [x] `AlbumMessage` (toast de guardado + errores + aria-labels)
- [x] `AlbumLibrary` (buscador, favoritos, vacío, borrar, editar tags)
- [x] `AlbumCard` (contador item/items, «temporary», favoritos, acciones)
- [x] Mapa: fallback de etiqueta de ubicación compartida
- [x] Botones de acción rápida del composer (`FrequentPhrasesMenu`, `PhotoAlbumsSheet`,
      `LocationConfirmDialog`) que estaban en español fijo → claves `chat.phrases`/`chat.photos`/`chat.location`
- [x] Test del composer actualizado a los valores localizados

> `PhotoAlbumsSheet` también localizado (bloque `chat.albums.*` en en/es/eu).

## #4 — Ajustes de Apariencia: reestructurar ✅

La pantalla apilaba 12+ controles y 2 previews en un scroll único. Ahora usa un
control segmentado (**General / Browse / Chat**) con la preview al inicio de cada
grupo.

- [x] Agrupar en sub-pestañas (`Tabs` segmentado) con título de la pantalla arriba
- [x] Preview al inicio de cada grupo (GridPreview en Browse, ChatPreview en Chat)
- [x] Clave i18n nueva `appearance.general` (en/es/eu)
- [x] check limpio · lint limpio · 55 tests de settings verdes

> Nota: la barra de pestañas no es _sticky_ (las clases arbitrarias de offset
> están restringidas en rutas y evitamos solapar la cabecera fija). Cada sección
> es corta, así que el scroll es mínimo. No pude verificar visualmente la página
> (ruta protegida, requiere sesión) — a confirmar en el dispositivo.

---

## Pendientes de fases posteriores (propuestas, no acordadas aún)

- ~~#3 Descubribilidad de Mapa/Álbumes~~ ✅ Ajustes (Yo) ahora enlaza a Mapa y a Álbumes guardados (`settings.albums`), ambos localizados; la página `/albums` usa i18n. Falta valorar un acceso desde el Browse/barra inferior.
- #5 Unificar notas de perfil (favorito vs. metadatos locales)
- #6 Pulido de guardado/recepción (refresco en vivo del mapa, uso de almacenamiento)
- #7 Estados vacíos/carga consistentes
- #8 Accesibilidad y contraste
- #9 Micro-detalles (duplicidad de acciones rápidas)
