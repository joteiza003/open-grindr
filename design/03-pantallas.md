# 03 · Guía por pantalla

Las 42 rutas de `src/routes/**`. Para cada una: qué busca el usuario, cómo se
estructura y qué cambia con «Lumen». **Ningún cambio altera datos, estado,
rutas ni comportamiento**: solo jerarquía, superficies, tipografía y espaciado.

Clave de lectura: `CH` = chrome compartido (cabecera, barra inferior,
subpágina), definido en [02-componentes.md](02-componentes.md) §4.

---

## A. Arranque y acceso

### A.1 `/onboarding` — Bienvenida por pasos

- **Objetivo:** entender qué es la app y completar el mínimo legal/config.
- **Estructura:** pasos a pantalla completa con progreso, ilustración o
  bloque de texto, acción principal abajo.
- **Cambios:** lienzo `--bg-canvas` limpio (se retira el lavado radial y el
  grano); paso actual en `--text-overline` + barra de progreso de 3 px
  `--accent`; título `--text-display`; cuerpo `--text-body-lg` con
  `--text-secondary` y ancho 60ch; acción principal `primary` a ancho completo
  con 16 de margen y área segura; "Saltar" en `ghost` arriba a la derecha.
  Los checkpoints se separan 32 px y el paso activo se marca con punto de 6 px.
- **Estados:** carga (skeleton del bloque), error (banner `danger`), último
  paso (acción `primary` + secundaria "Volver").

### A.2 `/auth/sign-in`, `/auth/sign-up`, `/auth/password-reset`, `/auth/sign-in/google`

- **Objetivo:** entrar o crear cuenta sin fricción.
- **Estructura:** `auth/+layout.svelte` con marca arriba, formulario centrado,
  acciones sociales y enlace de cambio de modo.
- **Cambios:** columna centrada de 400 px sobre `--bg-canvas`; logotipo 56;
  título `--text-title-1`, subtítulo `--text-body` `--text-secondary`;
  campos con etiqueta visible y separación 16; acción principal 52 de alto;
  divisor "o" con hairlines y `--text-caption`; botones sociales `secondary`
  con icono 20; aviso legal `--text-caption` `--text-tertiary` a 24 px del
  final. Errores en banner `danger` arriba del formulario (no toast).
- **Estados:** enviando (botón con spinner y `aria-busy`), error de
  credenciales (campo en `danger` + banner), bloqueo/reCAPTCHA (banner
  `warning` con la explicación actual, solo reestilizada).

---

## B. Núcleo

### B.1 `/` — Browse (rejilla)

- **Objetivo:** ver quién hay cerca y abrir un perfil.
- **Estructura:** `TopBar` fija (filtros rápidos, edad, posición, modo de
  vista) + rejilla virtualizada + `EmptyGrid`/`LocationEmpty`/`LocationChange`.
- **Cambios:**
  - `TopBar`: 56 de alto, fondo translúcido 72 % con blur del nivel
    configurado, hairline inferior solo al desplazar; filtros en píldoras de
    32 de alto con `--bg-raised` y hairline, activos en `--accent-soft` +
    borde `--accent-border`; icono de filtros 20; contador de resultados en
    `--text-caption` tabular alineado a la izquierda.
  - Rejilla: separación 4/10 px, radio exterior 18, etiqueta de distancia con
    degradado de 72 px y texto `--text-caption` tabular; hover de una sola capa
    (escala 1.02).
  - El marcador de posición y el botón de ubicación pasan a la píldora de
    cristal con icono 20 y etiqueta solo en escritorio.
- **Estados:** primera carga (6 esqueletos), sin resultados (`EmptyGrid` con
  icono 48 + acción "Ampliar filtros"), sin ubicación (`LocationEmpty` con
  acción `primary` y explicación de 2 líneas), cambio de ubicación (banner
  `info` + acción).

### B.2 `/right-now`

> **Estado real (comprobado por captura):** en este build la pestaña **no está
> implementada**; muestra una tarjeta centrada «Unimplemented — tracking in
> #43». No hay nada que rediseñar aquí: hereda el sistema (superficie, hairline,
> radio e icono en acento) y la guía siguiente queda como objetivo para cuando
> se implemente.

- **Objetivo:** ver publicaciones efímeras cercanas.
- **Estructura:** cabecera + lista/rejilla de publicaciones con caducidad.
- **Cambios:** tarjetas de 4:5 con radio 18, degradado inferior y etiqueta de
  tiempo restante en píldora `--bg-overlay`/72 %; autor en `--text-label`,
  distancia en `--text-caption` tabular; acción de reportar en el menú de la
  esquina (icono 20, área 44). Sin cambios en la carga de medios.
- **Estados:** vacío ("No hay nada ahora mismo" + acción de refrescar),
  caducando (barra de progreso de 2 px `--warning`).

### B.3 `/interest` → `/interest/taps` y `/interest/views`

- **Objetivo:** revisar quién te ha dado un toque o te ha visto.
- **Estructura:** `interest/+layout.svelte` con dos pestañas (segmentado) y
  `InterestPager` deslizante.
- **Cambios:** pestañas segmentadas de 36 de alto en `--bg-inset` centradas;
  filas de 72 con avatar 56, nombre `--text-body` 500, hora relativa
  `--text-caption` tabular; estado no visto con punto `--accent` de 8 px y
  fondo `--accent-soft` en la fila; acción "Devolver el toque" en `primary`
  compacta dentro de la fila (40 de alto) y "Ver perfil" como toque de fila.
- **Estados:** vacío por pestaña ("Aún no hay toques" con la explicación de qué
  son), carga (5 filas esqueleto), error (banner + reintentar).

### B.4 `/profile/[profileId]`

- **Objetivo:** decidir si escribir, guardar o bloquear.
- **Estructura:** visor de fotos paginado + cabecera de identidad + bloques de
  datos (físico, tribus, intereses, notas) + barra de acciones.
- **Cambios:** nombre `--text-title-2`, edad y estado en `--text-body`
  `--text-secondary`; distancia en `--text-caption` tabular con icono 16;
  datos en rejilla de dos columnas con etiqueta `--text-overline` y valor
  `--text-label`; "Nota" unificada como fila con icono y chevron; barra de
  acciones fija al pie (44 de alto) con `primary` "Escribir", `secondary`
  "Favorito" y `ghost` para el resto; el menú de bloqueo/reporte en `danger`.
- **Estados:** perfil enmascarado (bloqueado/oculto) con superficie `--bg-inset`
  y acción de desbloquear; fotos cargando (skeleton con la misma proporción);
  sin foto (placeholder convexo existente, solo se ajusta el color).
- **Nota:** el paginador y el gesto de vuelta no se tocan (`profile-back-button`,
  `profile-pager-track` fijan su comportamiento).
- **Pendiente detectado (oleada 2):** el cuerpo del perfil no reserva espacio
  para su barra inferior fija (`bottom-nav/OpenConversationButton.svelte` y las
  acciones rápidas), así que los chips de datos (`profile-fact-pills`) quedan
  por debajo. Hoy el único sitio que reserva área segura es la imagen
  (`ImageCarousel.svelte`). La corrección va en `ProfilePane`: un
  `padding-bottom` en el contenedor de scroll equivalente al alto de la barra
  más el área segura, como hace el chat con `pb-nav-clear`.

### B.5 `/chat` — Bandeja

- **Objetivo:** encontrar la conversación y responder.
- **Estructura:** cabecera con filtros/pestañas + buscador + lista + hoja de
  filtros.
- **Cambios:** buscador de 44 con icono 20 dentro de `--bg-inset` y radio 14;
  filas de 72 (ver 02-componentes §6.4); filtros activos en píldoras
  `--accent-soft`; separadores de sección ("Fijadas", "Sin leer") en
  `--text-overline`; la hoja de filtros conserva su mecánica, con grupos de
  56 y acciones al pie.
- **Estados:** vacío ("Ninguna conversación todavía" + acción "Ver gente"),
  filtro sin resultados (acción "Quitar filtros"), carga (6 filas esqueleto).

### B.6 `/chat/[conversationId]` — Conversación

- **Objetivo:** leer y responder con contexto.
- **Estructura:** cabecera con contraparte + lista de mensajes + compositor +
  hojas auxiliares (medios, álbumes, frases, ubicación, traducción).
- **Cambios:** fondo `--bg-canvas` con el tapiz de chat solo si el usuario lo
  eligió; burbujas, agrupación y hora según 02-componentes §6; cabecera de 56
  con avatar 36, nombre `--text-label` y estado `--text-caption`; acciones
  (llamar, vídeo, más) en `ghost` 44; compositor según §6.3; hoja de medios con
  rejilla de 3 columnas y barra de selección fija; traducción en línea con
  fondo `--bg-inset` y etiqueta `--text-overline`.
- **Estados:** cargando historial (esqueleto de burbujas alternas), error de
  envío (burbuja con borde `danger` y "Reintentar"), sin conexión (banner
  `warning` sobre el compositor), traducción en curso (línea de brillo).
- **Nota:** `chat-stack.spec.ts` mide transformaciones del apilado y
  `message-max-width.spec.ts` el ancho útil: los tokens deben mantener la
  geometría (ancho máximo y márgenes) dentro de tolerancia.

### B.7 `/map`

- **Objetivo:** explorar perfiles por zona, círculos y marcadores.
- **Estructura:** mapa Leaflet + `MapHud` + `CircleEditor`/`MarkerEditor` +
  `MapCircleLayer` + tarjeta de elemento seleccionado.
- **Cambios:** HUD y controles en píldoras `--bg-overlay`/78 % con blur, radio
  18, `e2`, botones 44; editor en hoja inferior de radio 24 con asa, campos de
  44 y acciones al pie; lista de elementos en filas de 56 con punto de color de
  8 px, nombre `--text-label` y radio en `--text-caption` tabular; círculos con
  relleno al 12 % y borde 2 px (3 px seleccionado). Se conserva el logaritmo
  del radio y la geometría de los tiradores.
- **Estados:** sin permiso de ubicación (banner `warning` + acción), sin
  elementos (invitación a crear el primero), guardando (spinner en la acción).

### B.8 `/albums` — Álbumes guardados

- **Objetivo:** volver a ver lo guardado.
- **Estructura:** rejilla de álbumes + buscador.
- **Cambios:** tarjetas cuadradas con portada, radio 18, degradado inferior,
  nombre `--text-label` y contador `--text-caption`; acción de editar en el
  menú de la esquina; vacío con icono 48 y explicación.
- **Estados:** vacío, búsqueda sin resultados, miniatura rota (`BrokenMedia`
  con icono + reintento).

---

## C. Ajustes

Todas usan `CH` de subpágina: barra con volver + título + acción, cuerpo en
secciones de 32 y grupos de tarjeta (radio 18, hairline, filas de 56).

### C.1 `/settings` — Yo

- **Objetivo:** ver mi perfil y llegar a cualquier ajuste.
- **Cambios:** cabecera de perfil (avatar 80, nombre `--text-title-2`, edad y
  estado en `--text-body`), acciones "Editar" y "Ver mi perfil"; buscador de
  ajustes de 44 (si existe) y grupos de filas de 56 con icono 20 a la
  izquierda, título `--text-label`, valor `--text-secondary` y chevron 16;
  encabezados de grupo en `--text-overline` `--text-tertiary`; acciones
  destructivas aisladas en su propio grupo con tono `danger`.
- **Estados:** perfil cargando (skeleton de cabecera).

### C.2 `/settings/profile`

- **Objetivo:** editar el perfil propio.
- **Cambios:** formulario en grupos (Identidad, Físico, Intereses, Fotos);
  cada campo con etiqueta visible; los selectores de valores (edad, peso,
  altura, tribus) usan el patrón de lista con valor a la derecha; barra de
  guardado fija (`SaveChangesBar`) con `primary` "Guardar" deshabilitada hasta
  que haya cambios y contador de cambios pendientes en `--text-caption`.
- **Estados:** guardando, error de validación (campo + resumen arriba).

### C.3 `/settings/account` y derivadas

| Pantalla | Cambios clave |
|---|---|
| `/settings/account` | grupos de visibilidad y seguridad, filas de 56 con switch; aviso de cuenta en banner; cierre de sesión en grupo propio con `danger` |
| `/settings/account/privacy` | filas con descripción de 2 líneas (`--text-caption`) y switch a la derecha; ayudas bajo el título |
| `/settings/account/blocked` | lista de filas de 64 con avatar 40 y acción "Desbloquear" `outline` compacta; vacío con explicación |
| `/settings/account/hidden` | lista ordenada por recientes con marca de fecha `--text-caption`; misma anatomía de fila |

### C.4 Álbumes propios

| Pantalla | Cambios clave |
|---|---|
| `/settings/albums` | rejilla de 2 columnas de portadas 4:5, nombre y contador; acción "Nuevo álbum" en `primary` fija al pie o en la cabecera según ancho |
| `/settings/albums/new` | formulario de una sola tarea: campo nombre (44) + contador de 24 caracteres + `primary` a ancho completo |
| `/settings/albums/[albumId]` | cabecera con portada y nombre editable; rejilla de contenido con modo de selección y orden por toque; barra de selección fija; eliminar en `danger` con confirmación |

### C.5 `/settings/appearance` — Apariencia

- **Objetivo:** ajustar tema, acento, densidad, desenfoque y chat.
- **Estructura actual:** 12+ controles en un scroll, con pestañas General /
  Browse / Chat (trabajo ya hecho).
- **Cambios:** cada grupo como tarjeta con encabezado `--text-overline`; los
  presets de acento pasan a **muestrario de 7 círculos de 40** con borde de
  selección de 2 px y nombre debajo en `--text-caption`; el tema es un
  segmentado de 3 (Sistema/Claro/Oscuro); la densidad y las animaciones son
  filas con switch; la intensidad de desenfoque es un segmentado de 4 con una
  previsualización real de 96 de alto que usa el token elegido. Se añaden los
  **looks de fábrica** (ver [04-implementacion.md](04-implementacion.md) §3)
  como tarjetas de 96 con miniatura del lienzo y del acento.
- **Estados:** previsualización actualizada en vivo; "Restablecer" por grupo.

### C.6 `/settings/phrases`

- **Objetivo:** gestionar frases frecuentes.
- **Cambios:** lista de filas de 56 con texto `--text-body` y acciones
  (editar/borrar) reveladas por el menú de la fila; añadir en `primary` desde
  la cabecera; agrupación por uso reciente en secciones; orden por arrastre con
  el asa de 24 a la derecha.

### C.7 `/settings/translation` y `/settings/translation/languages`

- **Objetivo:** elegir proveedor/idiomas de traducción.
- **Cambios:** filas con radio y descripción (`--text-caption`); estado del
  proveedor en badge (`success`/`warning`); lista de idiomas con búsqueda, fila
  de 56, bandera/etiqueta y check `--accent` a la derecha; idioma de origen y
  destino en cabecera fija con la flecha de intercambio (44).

### C.8 `/settings/app` y derivadas

| Pantalla | Cambios clave |
|---|---|
| `/settings/app` | filas de 56 agrupadas por tema (notificaciones, icono, actualizaciones, créditos); versión en `--text-caption` tabular al pie |
| `/settings/app/notifications` | filas con switch y descripción; permiso del sistema en banner `warning` con acción |
| `/settings/app/icon` | previsualización de icono 96 sobre fondo `--bg-inset` y rejilla de variantes de 64 en 4 columnas |
| `/settings/app/credits` | texto corrido en `--text-body` con `--text-secondary`, secciones de 32 y enlaces en `--accent-text`; sin tarjetas por dependencia |

---

## D. Transversal

### D.1 `+error.svelte`

- Ilustración/icono 48 `--text-tertiary`, título `--text-title-2`, explicación
  `--text-body` 48ch, acciones "Reintentar" (`primary`) y "Volver"
  (`secondary`), detalle técnico plegable en `--text-caption` con
  `--bg-inset` y radio 14.

### D.2 Layouts

| Layout | Papel en el nuevo sistema |
|---|---|
| `+layout.svelte` (raíz) | toasts abajo con 16 de margen y área segura; sin cambios de comportamiento |
| `(protected)/+layout.svelte` | contenedor de apilado; conserva `live-stack-*` y sus transformaciones |
| `(protected)/(navbar)/+layout.svelte` | reserva de espacio para `CH` (barra inferior) usando `--nav-height` |
| `(protected)/(navbar)/settings/(subpage)/+layout.svelte` | `SubpageScreen` unificado |
| `auth/+layout.svelte` | columna centrada, marca arriba, sin barra inferior |
| `interest/+layout.svelte` | pestañas segmentadas centradas |

### D.3 Estados globales

- **Conexión:** banner `warning` bajo la cabecera, altura 36, con acción
  "Reintentar".
- **Actualización disponible:** banner `info` con "Actualizar" como acción.
- **Toasts:** ancho máximo 400, radio 14, `e2`, icono 20 según tono,
  autodestrucción 4 s; posición según `toast-placement.spec.ts` (no cambia).
