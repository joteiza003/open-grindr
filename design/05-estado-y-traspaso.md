# 05 · Estado y traspaso

Documento de cierre de fase para que cualquiera (tú, yo en otra sesión, u otro
agente) pueda continuar sin releer todo el histórico.

## 1. Qué está entregado

| Pieza | Dónde | Estado |
|---|---|---|
| Sistema de diseño (fundamentos) | [01-fundamentos.md](01-fundamentos.md) | completo |
| Catálogo de componentes | [02-componentes.md](02-componentes.md) | completo |
| Guía por pantalla (42 rutas) | [03-pantallas.md](03-pantallas.md) | completo |
| Plan de implementación y contratos | [04-implementacion.md](04-implementacion.md) | completo |
| Guía visual viva | [index.html](index.html) → `design/dist/index.html` | completo |
| Comparativa antes/después | [comparativa.html](comparativa.html) | 16 pantallas × 2 temas |
| Tokens claro/oscuro + acento por tema | `src/layout.css` | implementado y verificado |
| Capa de acabado «Lumen» por slots | `src/layout.css` | implementado |

## 2. Qué se ha aplicado al código

- **Tokens**: superficies por capas, textos con contraste AA, escala tipográfica
  cerrada, radios explícitos, elevación de 5 planos, estados, movimiento;
  acento derivado por tema (tono y croma por preset, luminosidad por tema).
- **Primitivas**: `button` (radios por rol, variantes por superficie, disabled
  38 %), `item` (radio 18, hover con capa de estado), `empty` (escala
  tipográfica, sin borde fantasma).
- **Chrome**: barra inferior (etiquetas overline, activo en acento suave),
  cabecera de subpágina (título `title-3`), segmentado de la bandeja, chip
  elevado del paginador de Interés, encabezados de sección de ajustes.
- **Pantallas**: rejilla de Browse (distancia con fondo, chips), bandeja,
  conversación (burbuja entrante neutra, compositor), ajustes (filas
  agrupadas), perfil (scrim del nombre y despeje inferior).
- **Correcciones de contraste del tema claro**: previsualización de filas no
  leídas (`text-white` → `text-foreground`) y burbuja entrante (azul → neutra).

## 3. Qué queda

| Pendiente | Nota |
|---|---|
| Revisión visual de Álbumes | prevista, no hecha (sin capturas) |
| Comprobar en pantalla auth y onboarding | retoque de tipografía y botones `lg` aplicado en `SignInForm` y `onboarding`; sin capturas |
| Altura de controles a 44 px | token `--control-height` y regla en `layout.css` añadidos; falta verificar guardas de maquetación con capturas |
| Decisiones de §6 | tema/acento por defecto |

**Hecho en la sesión de continuación:** looks de fábrica (`looks.ts`,
`LookSetting.svelte`, preferencia `look`), «Oleada 3» de primitivas
(segmentados, sliders, menús, barra de comandos) y retoque de auth/onboarding.
El mapa ya solo tiene marcadores y ubicaciones compartidas (sin círculos) y sin
`backdrop-blur` propio, lo que arregla `layer-map.test.ts`.

> **Hecho desde la primera versión de este documento:** el buscador de Álbumes
> se resolvió en su origen, la primitiva `Input` (radio a la escala, superficie
> `inset` y hairline real en lugar de radio a medida, borde transparente y fondo
> derivado del color de borde). Afecta a todos los campos de texto de la app.
> El efecto visual es moderado; el valor es de coherencia con los tokens.

## 4. Hallazgos que conviene no perder

- **`/right-now` no está implementada** en este build: muestra «Unimplemented —
  tracking in #43». No hay nada que rediseñar ahí.
- **`app-settings-page.svelte.test.ts`** tarda ~80 s en importar y puede agotar
  el hook de 90 s con la suite completa en paralelo; solo, pasa.
- **Dos fallos de test preexistentes** (no causados por el rediseño, probado con
  `git show HEAD`): el texto del aviso F-Droid en `notifications-page` y
  `GoogleSignInForm` (el componente dice la versión corta y el test espera la
  larga).
- **La suite unitaria se cae con `EPERM`** si no se redirige el temporal (ver §5).
- **Vite se caía** con `EBUSY` por los directorios de escritura atómica; se
  ignoran con `**/*.tmpdir/**` en `vite.config.mjs`.

## 5. Cómo ejecutar

```powershell
# Servidor de demo para capturas (se deja levantado y se reutiliza)
$env:PUBLIC_ENABLE_DEMO='1'; $env:PUBLIC_BACKDROP_BLUR='max'
bunx vite dev --port 5180 --strictPort

# Capturas antes/después (reutilizando el servidor)
bun scripts/design-captures.ts --label after --theme both --display phone --base-url http://localhost:5180

# Guía visual: build + capturas por sección
bunx vite build --config design/styleguide.vite.config.mjs
bun scripts/design-styleguide-shots.ts

# Tests (el temporal redirigido evita el EPERM de vitest)
$env:TEMP = "$PWD\design\.tmp\vitest-temp"; $env:TMP = $env:TEMP
bun run test:unit

bun run check      # svelte-check: 0 errores, 0 advertencias
```

## 6. Decisiones tuyas pendientes

1. **Tema por defecto**: hoy el sistema mantiene oscuro (el claro está a la par
   y verificado). ¿Claro por defecto?
2. **Acento por defecto**: hoy ámbar. Hay siete presets listos.
3. **Looks de fábrica**: implican una preferencia nueva; dime si tiro con ellos.

## 7. Contratos respetados

`data-slot` y clases funcionales intactos (`app-nav-island`,
`rounded-composer`, `.photo-grid` y sus esquinas, `pblur*`, skin de WhatsApp…),
claves i18n sin tocar, puntos de ruptura sin tocar, y el respaldo
`:root:root` del blur sigue siendo el último bloque de `layout.css` (lo exige
`layer-map.test.ts`).

## 8. Inventario de lo modificado

**Rediseño (21 ficheros, todos de presentación):**

```
src/layout.css
src/lib/appearance/{accents,appearance,chat-colors}.ts
src/lib/components/filters/QuickFilterButton.svelte
src/lib/components/shared/{NavBar,SubpageScreen}.svelte
src/lib/components/ui/{button/button,item/item,input/input}.svelte
src/lib/components/ui/empty/{empty,empty-title,empty-description}.svelte
src/routes/(protected)/(navbar)/interest/+layout.svelte
src/routes/(protected)/(navbar)/profile/[profileId]/{ProfileHero.svelte,pager/ProfilePane.svelte}
src/routes/(protected)/(navbar)/settings/(subpage)/{account,app}/+page.svelte
src/routes/(protected)/chat/{Conversation.svelte,Conversation.svelte.test.ts,ConversationsList.svelte}
vite.config.mjs            (ignora *.tmpdir: evita el cierre de Vite por EBUSY)
```

**Nuevo:** `design/**` (documentación, guía, comparativa, capturas) y
`scripts/design-captures.ts`, `scripts/design-styleguide-shots.ts`.

**De otro proceso, no tocar:** `src/lib/{map,model/map-elements,i18n}/**`,
`src/lib/components/map-elements/**` y `src/routes/(protected)/map/+page.svelte`.

> El único fichero de test tocado es `Conversation.svelte.test.ts`, y solo para
> actualizar la expectativa del color de énfasis (`text-white` →
> `text-foreground`), que era precisamente el bug de contraste del tema claro.
