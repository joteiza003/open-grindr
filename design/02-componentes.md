# 02 · Componentes

Catálogo de la capa 1 (`src/lib/components/ui/**`, 241 ficheros, 40 familias) y
de los componentes compartidos de la capa 2. Para cada uno: anatomía, medidas,
estados y las reglas que evitan que vuelva la dispersión actual.

Convención de medidas: `alto · radio · padding` en píxeles. Todos los tamaños
táctiles son ≥ 44 salvo que se indique.

---

## 1. Acciones

### 1.1 Button

| Variante | Superficie | Texto | Borde | Uso |
|---|---|---|---|---|
| `primary` | `--accent` | `--text-on-accent` | — | una sola por pantalla: la acción esperada |
| `secondary` | `--bg-raised` | `--text-primary` | hairline | acciones alternativas equivalentes |
| `outline` | transparente | `--text-primary` | `--border-strong` | acciones en barras y tarjetas |
| `ghost` | transparente | `--text-secondary` | — | acciones terciarias, iconos |
| `danger` | `--danger` | blanco | — | destructivo, siempre con confirmación |
| `link` | — | `--accent-text` | — | navegación textual |

- Alturas: `sm` 36 · `md` 44 · `lg` 52. Padding horizontal 12 / 16 / 20.
- Radio `--radius-md` (14). Con icono: hueco 8, icono 20 (`18` en `sm`).
- Estados: hover 6 %, pressed 10 % + escala 0.985 (100 ms), focus anillo 2 px,
  disabled 38 %.
- **Un solo `primary` por vista.** Si hay dos, uno pasa a `secondary`.
- Ancho completo en formularios móviles; ancho propio en barras y cabeceras.
- `loading`: el botón conserva su ancho (el spinner sustituye al icono) y se
  marca `aria-busy`.

### 1.2 Button group / Toggle group

Un solo contenedor con `--bg-inset`, padding 2 y radio `--radius-md`; los
segmentos interiores usan `--radius-sm` y el activo se rellena con
`--accent-soft`. Se usa para vistas (`Grid/Lista`), pestañas locales y filtros
de un solo valor. Nunca más de 5 segmentos visibles.

### 1.3 Icon button

44 × 44 el área, 20 el icono, radio `--radius-full` en cabeceras flotantes y
`--radius-md` dentro de barras. Siempre con `aria-label`. Si va sobre foto,
fondo `--bg-overlay` al 62 % + hairline clara.

---

## 2. Formularios

### 2.1 Input / Textarea

- Alto 44 (una línea), radio `--radius-md`, fondo `--bg-inset`, hairline
  `--border-subtle`; en claro, fondo blanco con hairline más marcada.
- Padding 12 × 14. Texto `--text-body`; placeholder `--text-tertiary`.
- Foco: borde `--accent` + anillo 2 px al 30 % + fondo `--bg-surface`.
- Error: borde `--danger`, mensaje `--text-caption` en `--danger-text` a 6 px.
- Etiqueta siempre visible arriba (`--text-label`), nunca solo placeholder.
- Contador de caracteres a la derecha (`--text-caption`, tabular) cuando hay
  límite (nota de perfil, bio, nombre de álbum).

### 2.2 Switch / Checkbox / Radio

- Switch: pista 44 × 26, pulgar 22, radio full; activo `--accent`, inactivo
  `--bg-raised` con hairline.
- Checkbox: 22 × 22, radio `--radius-xs`; marcado `--accent` con check oscuro.
- Radio: 20 × 20 circular; seleccionado anillo de 2 px `--accent` + punto.
- Área táctil efectiva 44; el control se alinea al inicio de la fila y su
  etiqueta a 12 px.

### 2.3 Slider

Pista 4 px (`--bg-inset`), tramo activo `--accent`, pulgar 24 con anillo
`--bg-surface` de 2 px. Valor actual visible y editable encima. El radio del
mapa usa la escala logarítmica existente: no se toca la lógica, solo el aspecto.

### 2.4 Campos compuestos

`SwitchField` (fila con título + descripción + control) y `InputGroup`
(campo con sufijo/botón) comparten una retícula: control a la derecha, texto a
la izquierda, altura mínima 56 y hairline inferior si van en grupo.

---

## 3. Contenedores y superficies

### 3.1 Card

- Radio `--radius-lg` (18), fondo `--bg-surface`, hairline, `e1` solo si flota
  sobre contenido con foto.
- Padding 16; título `--text-title-3`, cuerpo `--text-body`, pie `--text-label`.
- Las tarjetas dentro de una lista **no** llevan sombra ni separación doble:
  se agrupan en un contenedor con hairlines entre filas (patrón `.og-settings-group`,
  que se mantiene y se refina).

### 3.2 Item / fila de lista

| Zona | Medida |
|---|---|
| alto mínimo | 56 (una línea) · 72 (dos líneas) · 88 (con avatar grande) |
| padding | 16 horizontal, 12 vertical |
| avatar | 48 (lista) · 56 (cabecera de chat) · 40 (compacto) |
| separador | hairline a 16 px del borde inicial, nunca sangrado completo |

Estados: hover fondo `--bg-raised`; pressed 10 %; seleccionada
`--accent-soft` + borde `--accent-border`; barra de no leído a la izquierda de
3 px `--accent`.

### 3.3 Sheet / Drawer

- Radio `--radius-xl` arriba, `e3`, asa de 36 × 4 a 8 px del borde superior.
- Cabecera: título `--text-title-3` centrado o alineado con acción a la
  derecha; altura 56; hairline inferior solo si hay scroll.
- El contenido respeta el área segura inferior; el pie de acciones es fijo y
  translúcido con `pb-safe`.
- Medio ancho en escritorio (`max-width: 480`) centrado, nunca a pantalla
  completa salvo el visor de medios.

### 3.4 Dialog / Alert dialog

- Ancho máximo 400 (móvil: ancho − 32), radio `--radius-xl`, `e4`, scrim 45 %.
- Estructura: icono opcional 40, título `--text-title-3`, cuerpo `--text-body`
  en `--text-secondary`, acciones en fila (secundaria a la izquierda,
  primaria a la derecha) o columna en móvil si hay más de dos.
- El destructivo va siempre a la derecha y en `danger`.

### 3.5 Popover, menú y menú contextual

- Radio `--radius-lg`, `--bg-overlay`, `e2`, hairline, padding 6.
- Fila de menú: alto 40, radio `--radius-sm`, icono 20 + etiqueta
  `--text-label`; atajo a la derecha en `--text-caption` + `Kbd`.
- Separador de 1 px con 6 px de margen vertical.
- Máximo 8 filas visibles antes de agrupar en submenú.

### 3.6 Tooltip

Fondo `--bg-overlay` con hairline, texto `--text-caption`, radio `--radius-sm`,
padding 6 × 10, retardo 400 ms de entrada y 0 de salida.

### 3.7 Alert / Banner

Cuatro tonos (`info`, `success`, `warning`, `danger`) con la misma anatomía:
icono 20, título `--text-label`, cuerpo `--text-caption`, fondo `-soft` al 14 %,
borde al 30 %, radio `--radius-md`, padding 12 × 14. Los avisos de sesión,
entitlements y cuenta (7 componentes de `feedback/`) usan este patrón único y
aparecen **encima** de la barra inferior, nunca tapando el contenido de la
cabecera.

---

## 4. Navegación

### 4.1 Barra inferior (NavBar)

- Contenedor: píldora translúcida, radio full, hairline, `e2`, blur del nivel
  actual del usuario; altura 64 + área segura.
- 5 destinos: icono 24 + etiqueta `--text-overline` (11/600). Activo: icono
  `fill` + color `--text-primary` + pastilla `--accent-soft` detrás; inactivo
  `--text-tertiary`.
- Indicador de no leído: punto de 8 px `--accent` con pulso suave (se elimina
  con reduce-motion), nunca badge numérico salvo en la lista de chat.
- El avatar "Yo" cierra la barra a la derecha con anillo de 2 px cuando está
  activo.
- Se conservan `app-nav`, `app-nav-island`, `data-active` y el `ProgressiveBlur`
  envolvente: son contratos de los tests y del sistema de blur.

### 4.2 Cabecera de pantalla

- Altura 56 (+ área segura), fondo translúcido al 72 % con blur, hairline
  inferior solo al hacer scroll.
- Título `--text-title-2` centrado en móvil, alineado a la izquierda en
  escritorio; acciones a la derecha (máximo 2 + "más").
- En escritorio, el título pasa a `--text-title-1` y aparece una línea de
  contexto (`--text-caption`, `--text-secondary`).

### 4.3 Subpágina (SubpageScreen)

Patrón único para las 19 pantallas de ajustes: barra superior con volver +
título + acción; cuerpo agrupado en secciones con encabezado `--text-overline`
en `--text-tertiary`; grupos con fondo `--bg-surface`, radio `--radius-lg`,
hairline y filas separadas; pie de guardado (`SaveChangesBar`) fijo, con
`primary` a la derecha y descarte a la izquierda.

### 4.4 Pestañas

Dos modos, no más: **segmentado** (dentro de una pantalla, 3–5 opciones, fondo
`--bg-inset`) y **subrayado** (navegación entre vistas hermanas, indicador de
2 px `--accent`). Nunca mezclados en la misma pantalla.

### 4.5 Barra de comandos (CommandCenter)

Hoja superior centrada, ancho 640, radio `--radius-xl`, `e4`. Campo de búsqueda
de 48 con icono 20; resultados en filas de 44 con icono, etiqueta y tipo a la
derecha; sección activa marcada con `--accent-soft`; pie con atajos en `Kbd`.

---

## 5. Datos y medios

### 5.1 Avatar

- Tamaños: 24 (grupo), 32, 40, 48 (lista), 56, 80, 128 (perfil).
- Radio `--radius-full`; en rejillas de perfil se admite `--radius-lg`.
- En línea: anillo de 2 px `--bg-surface` para separarlo del fondo; punto de
  estado (en línea / ausente) de 10 px abajo a la derecha con anillo del color
  del canvas.
- Sin foto: inicial sobre `--bg-raised` o el placeholder de dos formas convexas
  ya existente.
- Mientras carga: `Skeleton` circular del mismo tamaño (nunca un hueco).

### 5.2 Rejilla de fotos (Browse)

Se conserva íntegra la mecánica actual (columnas por contenedor, esquinas solo
en las cuatro esquinas exteriores, virtualización, `data-slot`). Cambios solo
estéticos:

- Separación 4 px (compacta) y 10 px (detallada) — hoy 2 y 0.65 rem.
- Los rótulos sobre foto (nombre, distancia y chips) se apoyan en la **píldora
  de escarcha** existente (`Frost` + `#frost-pill-40`). Su forma la dibuja el
  filtro SVG, no el radio CSS: se conserva a propósito, y solo se ajustan
  opacidad, borde y la legibilidad del texto. La distancia pasa a llevar fondo
  propio y números tabulares.
- Radio exterior `--radius-lg` (18), interior `--radius-sm` en modo compacto.
- La tarjeta gana un degradado inferior de 72 px para la distancia/edad y una
  etiqueta de estado (en línea / nuevo) arriba a la izquierda.
- Hover (solo puntero fino): escala 1.02 sobre la tarjeta, no 1.03 + 1.06
  anidado; se elimina la doble animación actual.
- El esqueleto de celda usa el mismo radio y un brillo direccional de 1.2 s.

### 5.3 Visor de medios (lightbox)

Fondo `--bg-canvas` al 96 %, sin blur. Controles en píldora `--bg-overlay` al
72 % con hairline; posición y contador en `--text-caption` tabular; gesto y
navegación intactos.

### 5.4 Reproductor de vídeo

Barra de progreso de 4 px con pulgar visible solo al interactuar; controles con
la misma píldora translúcida; tiempos en tabular; sin cambios de lógica de
streaming ni de buffering.

### 5.5 Skeleton y carga

- Bloque `--bg-raised` con brillo direccional (135°) de 1.2 s.
- Un esqueleto por forma final, con la misma altura y radio.
- Listas: máximo 6 esqueletos; rejillas: una fila de más.
- Nunca spinners de pantalla completa salvo en la primera carga de sesión.

### 5.6 Estado vacío

Icono 48 en `--text-tertiary` (nunca ilustración a color), título
`--text-title-3`, explicación `--text-body` en `--text-secondary` (máx. 2
líneas, 48ch) y una acción `secondary` o `primary`. Centrado ópticamente a 1/3
de la altura, no en el centro exacto.

---

## 6. Chat

### 6.1 Burbuja

- Radio `--radius-lg` (18) con la esquina del rabo a `--radius-xs` (6).
- Ancho máximo `min(78%, 560px)`; padding 10 × 14; texto `--text-body-lg`.
- Agrupación: 2 px entre burbujas consecutivas del mismo autor, 10 px entre
  autores; la hora solo en la última del grupo (`--text-caption`,
  `--text-tertiary`, tabular).
- Saliente: relleno de acento con `--message-bubble-out-foreground`; entrante:
  `--bg-raised` con hairline. Enlaces con subrayado fino del color de acento
  correspondiente al contraste de la burbuja.
- Estados: enviando (opacidad 70 %), fallo (borde `--danger` + "Reintentar"),
  leído (check a 60 %), editado (`--text-caption` "editado").
- Se conservan `data-slot="message-bubble"` y `bubble-meta`.

### 6.2 Cita (reply) y rabo

Conector en L con radio `--radius-quote-connector` (8) sustituido por una
línea de 2 px `--accent-border` y fondo `--bg-inset`; el texto citado va en
`--text-caption` con una línea máxima y elipsis.

### 6.3 Compositor

- Contenedor: píldora `--radius-lg`, `--bg-surface`, hairline, `e2`; altura
  mínima 48, crece hasta 5 líneas.
- Botón de acción a la derecha de 40 con `--accent`; el resto de acciones
  (adjuntos, frases, álbumes, ubicación) en fila propia encima o en el menú
  "+", con icono 20 y etiqueta `--text-overline`.
- El borrador se marca con una línea superior `--accent-border` y la etiqueta
  "Borrador · <destinatario>" en `--text-caption`.
- Se conservan `data-slot="message-composer"`, `rounded-composer` y la clase
  que el skin de WhatsApp reescribe.

### 6.4 Fila de conversación

Avatar 56 con punto de estado; título `--text-body` 500 en `--text-primary`;
previsualización `--text-caption` en `--text-secondary` (una línea con
elipsis); a la derecha, hora relativa tabular y, debajo, badge de no leídos
(píldora `--accent`, texto `--text-on-accent`, min-width 20).
Fijadas: fondo `--bg-inset` + icono de chincheta; silenciadas: icono de campana
tachada `--text-tertiary`. La fila mide 72.

### 6.5 Hojas de medios y álbumes

Rejilla de 3 columnas con separación 2 px, radio `--radius-sm` por celda;
barra de selección fija con contador, previsualización y acción `primary`.
Los álbumes usan tarjeta de portada cuadrada con nombre
(`--text-label`) y contador (`--text-caption`), y una acción de edición
accesible desde el menú de la esquina.

---

## 7. Mapa

- El mapa se mantiene (Leaflet) sin tocar su lógica; la interfaz encima usa el
  sistema: HUD en `--bg-overlay` al 78 % con blur, radio `--radius-lg`,
  `e2`; botones de 44; controles de zoom en columna con separación 1 px y
  radio `--radius-md`.
- Círculos: borde 2 px del color del elemento con relleno al 12 %; el
  seleccionado sube a 3 px + etiqueta con nombre y radio (`--text-caption`
  tabular). Los tiradores son de 14 px con anillo `--bg-surface`.
- Marcadores: pin 32 con sombra `e2`; el seleccionado crece a 40 y muestra la
  tarjeta de detalle anclada abajo.
- La escala métrica y los controles de "ver todo / mi ubicación" usan icono 20
  + etiqueta solo cuando hay sitio.

---

## 8. Tablas y listas densas de ajustes

Ninguna pantalla usa tabla real: las listas de bloqueados, ocultos, frases y
álbumes son listas agrupadas. Reglas: fila 56, título `--text-label`, valor a
la derecha en `--text-secondary`, chevron 16 en `--text-tertiary`, hairline
entre filas y ninguna sombra por fila.
