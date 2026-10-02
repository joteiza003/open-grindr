# 04 · Implementación

Cómo se lleva «Lumen» al código sin tocar la lógica: mapa de tokens, capas de
trabajo, presets, contratos que **no** se pueden romper y verificación.

---

## 1. Mapa de tokens

Los nombres actuales se **conservan** (los usan 241 primitivas, las hojas de
estilo de los skins y los tests); cambia su valor y se añaden los roles nuevos.

| Token actual | Se convierte en | Valor nuevo |
|---|---|---|
| `--background` | alias de `--bg-canvas` | `oklch(0.145 0.006 265)` oscuro · `oklch(0.985 0.003 265)` claro |
| `--foreground` | alias de `--text-primary` | `oklch(0.97 0.003 265)` · `oklch(0.24 0.01 265)` |
| `--card` / `--popover` | `--bg-surface` / `--bg-overlay` | nuevo escalón de superficies |
| `--muted` / `--muted-foreground` | `--bg-inset` / `--text-secondary` | contraste corregido |
| `--primary` / `--accent` | `--accent` (del preset) | ámbar por defecto, valores por tema |
| `--primary-foreground` | `--text-on-accent` | casi negro en ambos temas |
| `--secondary` | `--bg-raised` | — |
| `--border` / `--input` | `--border-subtle` / `--border-strong` | — |
| `--ring` | `--accent` | foco visible de verdad |
| `--destructive` | `--danger` | — |
| `--surface-0..3` | alias de canvas/surface/raised/overlay | se mantienen por compatibilidad |
| `--radius` | 14 px | base shadcn |
| `--radius-sm/md/lg/xl` | 10 / 14 / 18 / 24 px | **valores explícitos**, no múltiplos de `--radius` |
| `--radius-grid` | 18 px (antes 17) | mismo nombre (lo fija `photo-grid-corners`) |
| `--radius-composer` | 18 px (antes 19) | mismo nombre |
| `--radius-chat-panel` | 24 px (antes 27) | mismo nombre |
| `--spacing-avatar` | 40 px (antes 37.5) | mismo nombre |
| `--list-rail` | 117 px → **sin cambio** | afecta a la maquetación medida |
| `--motion-*` | 100 / 160 / 240 ms | se añade `--duration-4: 320ms` |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | se añade `--ease-exit` |

Nuevos tokens que no existían: escala tipográfica (`--text-display` …
`--text-overline`), elevación (`--elevation-1..4`), estados
(`--state-hover`, `--state-pressed`, `--accent-soft`, `--accent-border`,
`--accent-text`), sistema (`--success`, `--warning`, `--danger`, `--info` con
`-soft` y `-text`) y `--scrim-overlay`.

---

## 2. Capas y oleadas

### Oleada 1 — Fundamento y núcleo visible
1. `src/layout.css`: bloque de tokens (claro + oscuro), escala tipográfica,
   elevación, estados, motion; retirada del lavado `og-midnight-wash` y del
   grano por defecto (pasan a preset).
2. `src/lib/components/ui/**`: `button`, `input`, `textarea`, `card`, `item`,
   `badge`, `tabs`, `separator`, `skeleton`, `sheet`, `dialog`, `dropdown-menu`,
   `switch`, `checkbox`, `slider`, `tooltip`.
3. Chrome: `NavBar`, `SubpageScreen`, `SaveChangesBar`, cabeceras de `TopBar`,
   `ProgressiveBlur`/`Frost` (solo valores de opacidad y borde).
4. Pantallas: `/` (Browse), `/chat`, `/chat/[conversationId]`.

### Oleada 2 — Resto de pantallas
`/profile`, `/map`, `/interest/*`, `/right-now`, `/albums`, los 19 ajustes,
`/auth/*`, `/onboarding`, `+error.svelte`.

### Oleada 3 — Acabado
Primitivas restantes (menús, comandos, carrusel, resizable, kbd…), hojas de
medios y álbumes, `command-center`, los 34 componentes de `feedback/`, y los
presets de apariencia.

---

## 3. Looks de fábrica (presets)

Hoy `data-look` está fijado a `"midnight"` en
`src/lib/appearance/appearance.ts`. Se convierte en una preferencia real con
cuatro looks, cada uno un paquete de (tema, acento, densidad, tratamiento de
superficie, grano, desenfoque por defecto):

| Look | Carácter | Tema | Acento | Notas |
|---|---|---|---|---|
| **Lumen** (nuevo por defecto) | neutro frío, preciso | sigue al sistema | ámbar | sin grano, hairline clara, `blur: medium` |
| **Porcelain** | claro de alto brillo | claro | azul | bordes de 1 px muy finos, sombras suaves |
| **Midnight** | heredero del look actual | oscuro | ámbar | superficies profundas, grano sutil al 3 %, `blur: max` |
| **Slate** | profesional sobrio | oscuro | teal | densidad compacta por defecto |

**Único cambio que toca datos, no estilo:** añadir `look` a `Appearance` en
`src/lib/app-data/preferences.svelte.ts` y su validación en `serialize.ts`,
aplicarlo en `applyAppearance()` y exponerlo en `/settings/appearance`. Es
aditivo y compatible hacia atrás (sin `look` guardado → `lumen`). Se hace en la
oleada 3 y se revisa aparte, porque ya no es puramente CSS.

---

## 4. Contratos intocables

### 4.1 Hooks DOM y clases
- `data-slot`: `conversations-header`, `conversations-scroller`,
  `conversation-row`, `item`, `badge`, `message-bubble`, `bubble-meta`,
  `message-composer`, `composer-submit`, `skeleton`, `avatar`,
  `tracking-dot`, `live-stack-base`, `live-stack-sheet`, `live-stack-dim`.
- Clases funcionales: `rounded-composer`, `.photo-grid` (+ `-compact`,
  `-detailed`, esquinas por posición), `app-nav`, `app-nav-island`,
  `og-settings-group`, `pull-scroller`, `screen-nav-host`, `pblur*`, `frost`,
  `glass-*`, `media-chip`, `media-pill`, `scrollbar-thin`,
  `min-h-overscrollable`, `h-screen-safe`, `pb-nav-clear`, `bottom-nav-clear`,
  `pt-header-clear-*`, y `size-20` / `rounded-xl` que reescribe el skin de
  WhatsApp.
- Utilidades de `data-slot` del skin WhatsApp: se conservan o se actualiza el
  skin en el mismo cambio (nunca a medias).

### 4.2 Variables leídas por JavaScript o por tests
`--content-pb`, `--nav-height`, `--nav-clear`, `--safe-area-*`, `--screen-safe`,
`--screen-nav`, `--selection-bar-height`, `--list-rail`, `--spacer*`,
`--stack-scrim`, `--stack-edge`, `--message-bubble-in/out(-foreground)`,
`--radius-grid`, `--radius-composer`, `--radius-chat-panel`, `--bd-*`,
`--glass-controls*`, `--pblur-*`.

### 4.3 Puntos de ruptura (sincronizados con `src/lib/util/breakpoints.svelte.ts`)
`split 560` · `settings-dialog 424` · `selection-bar-compact 350` ·
`selection-bar-collapse 300` · `cramped 250` · umbrales `--container-grid3..7`
del photo-grid. **No se cambian.**

### 4.4 Specs con valores fijados (revisar en cada oleada)

| Spec | Qué fija | Acción prevista |
|---|---|---|
| `backdrop-blur.spec.ts` | `blur(8px)`, `background-image: none` | conservar los valores de `--bd-*` |
| `inbox-filters.spec.ts` | `padding-top: 60px` | conservar la reserva de la cabecera |
| `photo-grid-corners.spec.ts` | nº de columnas y 4 esquinas | conservar radios por contenedor |
| `grid-virtualization.spec.ts` | radio de la primera celda | radio exterior = `--radius-grid` |
| `media-tile-menu.spec.ts` | radios iguales entre celdas | celda uniforme |
| `chat-stack.spec.ts` | transformaciones del apilado | no tocar `live-stack-*` |
| `message-max-width.spec.ts` | ancho útil de mensajes | mantener `min(78%, 560px)` |
| `album-grid-width.spec.ts` | nº de columnas de la rejilla de álbum | — |
| `composer-clearance.spec.ts` | holgura del compositor | conservar `--content-pb` |
| `toast-placement.spec.ts` | posición de los toasts | no mover `Toaster` |
| `hover-pointer.spec.ts` | colores de hover distintos del reposo | la capa de estado los mantiene |
| `media-slot-contrast.spec.ts` | contraste chip/icono | la mejora de contraste debe seguir cumpliéndolo |

### 4.5 i18n
No se añaden, cambian ni borran claves: todo texto visible sigue pasando por
`t()` con las claves actuales en `en/es/eu`.

---

## 5. Verificación

| Paso | Comando | Criterio |
|---|---|---|
| Tipos y Svelte | `bun run check` | sin errores nuevos |
| Lint | `bun run lint` | limpio |
| Unitarios | `bun run test:unit` | 250+ verdes |
| e2e funcional | `bun run test:e2e` | mismos resultados que la línea base |
| Guarda de maquetación | `bun run test:e2e:guard` | sin regresiones de layout |
| Capturas | `bun scripts/design-captures.ts --label after` | comparativa antes/después |
| Contraste | axe en e2e (`@axe-core/playwright`) | sin violaciones AA |

**Guardarraíl nuevo propuesto:** un test unitario que calcule el contraste de
los pares de tokens declarados (texto/fondo, on-accent/acento) y falle si baja
de 4.5:1 o 3:1. Evita que una pasada estética rompa la accesibilidad.

---

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Un cambio de token rompe specs con valores fijos | revisar la tabla §4.4 en cada oleada; ejecutar e2e antes de cerrar |
| El tema claro revela contrastes malos | guardarraíl de contraste + capturas en claro de cada pantalla tocada |
| Densidad compacta por debajo de 44 px táctiles | la densidad solo reduce espaciado, no áreas de control |
| El skin de WhatsApp depende de utilidades concretas | conservar las clases o actualizar el skin en el mismo cambio |
| Coste de `backdrop-filter` en Android | ningún blur nuevo; se reutilizan los niveles existentes |
| Deriva futura hacia valores sueltos otra vez | regla de oro de `README.md` §3 + revisión de PR sobre tokens |

---

## 7. Orden de trabajo de la oleada 1 (ficheros)

1. `src/layout.css` — tokens, tipografía, elevación, estados, motion, retirada
   de parches visuales por defecto.
2. `src/lib/appearance/*` — `accents.ts` con `-text`, `-soft`, `-border`;
   `chat-colors.ts` con los valores por defecto nuevos.
3. `src/lib/components/ui/{button,input,textarea,card,item,badge,tabs,separator,skeleton,switch,checkbox,slider,tooltip,sheet,dialog,dropdown-menu}` — variantes y medidas.
4. `src/lib/components/shared/{NavBar,SubpageScreen,SaveChangesBar,ProgressiveBlur,Frost}.svelte`.
5. `src/routes/(protected)/(navbar)/(root)/**/top-bar/**` y `Grid.svelte` (solo clases).
6. `src/lib/components/chat/**`, `src/routes/(protected)/chat/**` y las burbujas.
7. Capturas `after` + comparativa.
