# 01 · Fundamentos

Todos los valores viven en `src/layout.css` (Tailwind v4). Los nombres que ya
existen (`--background`, `--card`, `--primary`, `--border`, `--radius-grid`,
`--radius-composer`, `--nav-height`…) **se conservan**: las 241 primitivas de
`src/lib/components/ui/` y los tests dependen de ellos. Lo que cambia es su
valor y, encima, se añaden los roles nuevos.

---

## 1. Color

### 1.1 Rampas neutras

Dos rampas frías-generosas, una por tema. Índice de luminosidad oklch:

| Paso | Oscuro | Claro | Uso típico |
|---|---|---|---|
| 1000 | `oklch(0.105 0.005 265)` | — | fondo de visor a pantalla completa |
| 900 | `oklch(0.145 0.006 265)` | — | **canvas** oscuro |
| 800 | `oklch(0.185 0.007 265)` | — | surface oscura |
| 700 | `oklch(0.235 0.008 265)` | — | raised / controles |
| 600 | `oklch(0.30 0.009 265)` | — | overlay, bordes fuertes |
| 100 | — | `oklch(0.985 0.003 265)` | **canvas** claro |
| 50 | — | `oklch(1 0 0)` | surface clara (tarjetas) |
| 200 | — | `oklch(0.955 0.004 265)` | inset claro |

### 1.2 Roles semánticos

Nombres nuevos (los antiguos se mantienen como alias para no romper nada):

| Rol | Oscuro | Claro |
|---|---|---|
| `--bg-canvas` | `oklch(0.145 0.006 265)` | `oklch(0.985 0.003 265)` |
| `--bg-surface` | `oklch(0.185 0.007 265)` | `oklch(1 0 0)` |
| `--bg-raised` | `oklch(0.235 0.008 265)` | `oklch(1 0 0)` |
| `--bg-overlay` | `oklch(0.26 0.009 265)` | `oklch(1 0 0)` |
| `--bg-inset` | `oklch(0.125 0.005 265)` | `oklch(0.955 0.004 265)` |
| `--text-primary` | `oklch(0.97 0.003 265)` | `oklch(0.24 0.01 265)` |
| `--text-secondary` | `oklch(0.80 0.008 265)` | `oklch(0.46 0.01 265)` |
| `--text-tertiary` | `oklch(0.68 0.008 265)` | `oklch(0.54 0.01 265)` |
| `--text-on-accent` | `oklch(0.20 0.03 85)` | `oklch(0.20 0.03 75)` |
| `--border-subtle` | `oklch(1 0 0 / 8%)` | `oklch(0.24 0.01 265 / 10%)` |
| `--border-strong` | `oklch(1 0 0 / 16%)` | `oklch(0.24 0.01 265 / 18%)` |

**Contraste garantizado** (WCAG 2.1 AA):

| Par | Ratio | Uso |
|---|---|---|
| primary / canvas y surface | ≥ 13:1 | texto principal |
| secondary / surface | 8,1:1 oscuro · 4,8:1 claro | metadatos, descripciones |
| tertiary / surface | 5,4:1 oscuro · 3,9:1 claro | solo ≥ 15 px o iconos decorativos |
| on-accent / accent (ámbar) | 7,4:1 oscuro · 6,0:1 claro | texto de botón principal |
| accent / canvas (texto de acento) | se usa `--accent-text`, no `--accent` | enlaces, estados |

> Regla: **el amarillo nunca lleva texto blanco**. El botón principal ámbar
> usa siempre `--text-on-accent` (casi negro), igual que la app original de
> Grindr: es familiar y cumple contraste.

### 1.3 Acento

Siete presets, conservados: `amber` (por defecto), `blue`, `teal`, `green`,
`violet`, `pink`, `orange`, `red`. Cada preset define cuatro valores por tema:

| Token | Función |
|---|---|
| `--accent` | relleno de acción principal y controles seleccionados |
| `--accent-text` | acento legible **como texto** sobre canvas/surface |
| `--accent-soft` | fondo suave (selección, chip, fila activa): acento al 12–16 % |
| `--accent-border` | borde de estado seleccionado: acento al 40 % |

Estados de la acción principal: reposo → hover (mezcla 6 % blanco en oscuro /
6 % negro en claro) → pressed (12 %) → disabled (38 % opacidad, sin cambiar de
color). El foco añade anillo, nunca cambia el relleno.

### 1.4 Color semántico de sistema

| Rol | Oscuro | Claro | Uso |
|---|---|---|---|
| `--success` | `oklch(0.75 0.15 155)` | `oklch(0.55 0.14 155)` | confirmaciones, en línea |
| `--warning` | `oklch(0.82 0.15 80)` | `oklch(0.62 0.14 70)` | avisos, caducidad |
| `--danger` | `oklch(0.68 0.19 22)` | `oklch(0.55 0.20 25)` | destructivo, bloqueo, error |
| `--info` | `oklch(0.75 0.12 240)` | `oklch(0.55 0.13 245)` | informativo neutro |

Cada uno con su variante `-soft` (fondo al 14 %) y `-text` (legible sobre
canvas). Nunca se usa el color de sistema como decoración.

### 1.5 Chat

Se mantienen los pares configurables por el usuario (`--message-bubble-in/out`
y sus `-foreground`). Cambian los **valores por defecto** y la forma:

| Token | Oscuro | Claro |
|---|---|---|
| `--message-bubble-out` | `oklch(0.84 0.16 88)` (ámbar suave) | `oklch(0.90 0.11 88)` |
| `--message-bubble-out-foreground` | `oklch(0.20 0.03 85)` | `oklch(0.24 0.04 85)` |
| `--message-bubble-in` | `oklch(0.235 0.008 265)` | `oklch(0.965 0.003 265)` |
| `--message-bubble-in-foreground` | `oklch(0.96 0.003 265)` | `oklch(0.24 0.01 265)` |

La burbuja propia es la única superficie saturada del chat: mantiene el
lenguaje de "un solo acento".

---

## 2. Tipografía

**Familia:** IBM Plex Sans Variable (ya incluida; sin dependencias nuevas).
Los números usan `font-variant-numeric: tabular-nums` en contadores, horas,
distancias y precios.

### 2.1 Escala

| Token | Tamaño/línea | Peso | Tracking | Uso |
|---|---|---|---|---|
| `--text-display` | 34 / 40 | 600 | −0.02em | cifras de onboarding, título de estado vacío |
| `--text-title-1` | 28 / 34 | 600 | −0.02em | título de pantalla completa |
| `--text-title-2` | 22 / 28 | 600 | −0.01em | cabecera de sección, nombre en perfil |
| `--text-title-3` | 18 / 24 | 600 | −0.01em | título de diálogo, encabezado de subpágina |
| `--text-body-lg` | 16 / 24 | 400 | 0 | texto largo, mensajes |
| `--text-body` | 15 / 22 | 400 | 0 | base de la app |
| `--text-label` | 13 / 18 | 500 | +0.01em | etiquetas, botones, filas |
| `--text-caption` | 12 / 16 | 400 | +0.01em | metadatos, ayudas |
| `--text-overline` | 11 / 14 | 600 | +0.08em | encabezado de grupo (MAYÚSCULAS) |

**Pesos permitidos:** 400, 500 y 600. Se elimina el 700 salvo en el logotipo.
La jerarquía se construye con tamaño + peso + color, no con negritas crecientes.

**Anchos de línea:** 60–75 caracteres en texto corrido → `max-width: 68ch`.

---

## 3. Espaciado y composición

- Unidad base 4 px. Escala: `2 4 6 8 12 16 20 24 32 40 48 64`.
- **Márgenes de página:** 16 px (teléfono), 24 px (tableta), 32 px (escritorio).
- **Ritmo vertical:** 8 px entre elementos hermanos, 16 px entre grupos,
  32 px entre secciones.
- **Anchos máximos:** lectura 720 px, listas 720 px, rejillas 1200 px,
  visor de medios sin límite.
- **Densidad compacta:** el ajuste existente reduce `--spacing` (0.25 → 0.22 rem);
  se conserva, y la escala tipográfica baja un paso en `--text-label`
  y `--text-caption` para no desbordar filas.
- **Alturas de control:** 44 px mínimo táctil; 40 px en escritorio con ratón;
  52 px en el botón principal de una pantalla de formulario.

---

## 4. Radios

Se sustituyen los valores a medida por una escala única:

| Token | Valor | Uso |
|---|---|---|
| `--radius-xs` | 6 px | chips, badges, marcas pequeñas |
| `--radius-sm` | 10 px | campos compactos, celdas de rejilla |
| `--radius-md` | 14 px | **base**: botones, campos, tarjetas de lista |
| `--radius-lg` | 18 px | tarjetas, burbujas, paneles |
| `--radius-xl` | 24 px | hojas (sheets) y diálogos |
| `--radius-full` | 999 px | avatares, píldoras, nav |

**Alias compatibles** (mismo valor, nombre antiguo conservado porque hay tests
y hojas de estilo que los referencian): `--radius-grid` → 18 px,
`--radius-composer` → 18 px, `--radius-chat-panel` → 24 px.

Reglas: nunca se redondea más de `--radius-xl`; las esquinas inferiores de las
hojas usan `--radius-xl` solo arriba; las burbujas llevan `--radius-lg` con la
esquina del rabo a `--radius-xs`.

---

## 5. Elevación

Cinco planos. En **oscuro** la jerarquía la marca el borde y el brillo
superficial; en **claro**, la sombra. Las sombras son siempre de dos capas
(contacto + ambiente), nunca de un solo valor duro.

| Plano | Oscuro | Claro |
|---|---|---|
| `e0` plano | sin sombra | sin sombra |
| `e1` tarjeta | `0 1px 2px rgb(0 0 0/.40)` + hairline | `0 1px 2px rgb(16 18 24/.06), 0 1px 1px rgb(16 18 24/.04)` |
| `e2` menú/popover | `0 4px 16px -4px rgb(0 0 0/.50)` | `0 4px 12px -2px rgb(16 18 24/.10)` |
| `e3` hoja inferior | `0 -8px 32px -8px rgb(0 0 0/.55)` | `0 -6px 24px -6px rgb(16 18 24/.14)` |
| `e4` modal | `0 24px 64px -16px rgb(0 0 0/.60)` | `0 24px 48px -12px rgb(16 18 24/.18)` |

Reglas:
- Un elemento **nunca** lleva borde fuerte y sombra fuerte a la vez.
- Los scrims oscurecen un 45 % en ambos temas (`--scrim-overlay`); en claro,
  además, desaturan el fondo 20 %.
- Máximo dos planos elevados visibles simultáneamente.

---

## 6. Estados interactivos

Capa de estado única aplicada por encima del color base:

| Estado | Oscuro | Claro | Notas |
|---|---|---|---|
| hover | blanco 6 % | negro 5 % | solo con puntero fino (`can-hover`) |
| pressed | blanco 10 % | negro 9 % | + escala 0.985, 100 ms |
| selected | `--accent-soft` | `--accent-soft` | + borde `--accent-border`, texto primario |
| focus-visible | anillo 2 px `--accent` a 2 px | igual | nunca se elimina; funciona en teclado y mando |
| disabled | contenido 38 % | igual | sin cambios de color de fondo |
| dragging | escala 1.02 + `e2` | igual | usado en rejillas de fotos |

El foco se dibuja con `outline` (no con `box-shadow`) para que sobreviva a
`overflow: hidden` y a las esquinas redondeadas.

---

## 7. Movimiento

| Token | Valor | Uso |
|---|---|---|
| `--duration-1` | 100 ms | hover, pressed, toggles |
| `--duration-2` | 160 ms | aparición de menús, cambios de estado |
| `--duration-3` | 240 ms | hojas, diálogos, transición de página |
| `--duration-4` | 320 ms | el máximo permitido (onboarding, cambio de tema) |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | todo lo que entra o se mueve |
| `--ease-exit` | `cubic-bezier(.4,0,1,1)` | todo lo que se va (30 % más rápido) |

Reglas:
- Solo se animan `transform`, `opacity` y `background-color`/`border-color`.
- Prohibido animar `width`, `height`, `top`, `left` y `filter` en listas.
- Entradas de lista: desplazamiento de 8 px + fundido, escalonado ≤ 24 ms por
  elemento, tope de 6 elementos escalonados.
- Hojas: suben 24 px con fundido; el fondo solo hace fundido.
- `prefers-reduced-motion` y el ajuste interno (`--reduce-motion`) dejan
  transiciones de 0.001 ms y eliminan todo desplazamiento.

---

## 8. Iconografía

- **Familia:** Phosphor (ya en uso). Un solo peso por contexto: `regular` en
  reposo, `fill` en estado activo (la barra inferior ya lo hace).
- **Tamaños:** 16 px (en línea con `--text-label`), 20 px (por defecto),
  24 px (acción de cabecera y barra inferior).
- Trazo óptico: cajas de 24 px con 2 px de margen interno, alineadas a la
  línea base del texto contiguo.
- Un icono nunca va solo si su significado no es universal: lleva etiqueta o
  `aria-label`.

---

## 9. Accesibilidad

- Contraste AA obligatorio (4.5:1 texto, 3:1 componentes y texto ≥ 24 px).
- Área táctil mínima 44 × 44 px, incluso si el icono mide 20 px.
- Foco visible en todo elemento interactivo, con recorrido lógico.
- Texto escalable al 200 % sin scroll horizontal: por eso no se usan alturas
  fijas en textos de varias líneas.
- `aria-label` en todo icono-acción; los `data-slot` existentes se conservan
  porque los tests de accesibilidad (`@axe-core/playwright`) los usan.
- Enumeraciones y listas mantienen su semántica (`ul/li`, `role="article"`),
  sin sustituirlas por `div` al reestilizar.
