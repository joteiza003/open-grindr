# Grindr + · Sistema de diseño «Lumen»

Rediseño integral de la interfaz de la app (SvelteKit + Tauri) **sin cambiar la
lógica de ninguna pantalla**: mismos datos, mismo estado, mismas rutas, mismos
contratos de `data-slot`, misma i18n. Solo cambia la capa de presentación.

| Documento | Contenido |
|---|---|
| [01-fundamentos.md](01-fundamentos.md) | Color, tipografía, espaciado, radios, elevación, estados, movimiento, accesibilidad |
| [02-componentes.md](02-componentes.md) | Catálogo de componentes con anatomía, medidas y estados |
| [03-pantallas.md](03-pantallas.md) | Guía pantalla por pantalla (42 rutas) |
| [04-implementacion.md](04-implementacion.md) | Mapa de tokens, capas de trabajo, presets, contratos intocables y verificación |
| [05-estado-y-traspaso.md](05-estado-y-traspaso.md) | Estado, pendientes, hallazgos y cómo ejecutar cada cosa |
| [styleguide.html](styleguide.html) | Guía visual viva sobre los tokens reales |
| `captures/` | Capturas antes/después por pantalla (modo demo) |

---

## 1. Principios

1. **Jerarquía antes que decoración.** Cada pantalla debe responder en un
   vistazo: qué es lo importante, qué es secundario y qué es acción. Si un
   adorno compite con el contenido, se elimina.
2. **Profundidad por capas, no por sombras.** Los planos se ordenan con
   superficies (`canvas → surface → raised → overlay`) y un borde de un píxel.
   La sombra solo confirma lo que la capa ya dice.
3. **Un acento, una intención.** El color de marca se reserva para la acción
   principal, la selección y el estado activo. Todo lo demás es neutro.
4. **La tipografía es estructura.** Una escala cerrada de 8 pasos y 3 pesos
   sustituye la mezcla actual de tamaños sueltos (`text-2xs`, `11px`, `0.7rem`).
5. **Movimiento con propósito.** Nada supera 320 ms, nada rebota, todo se
   desactiva con `prefers-reduced-motion` (ya soportado).
6. **Paridad claro/oscuro desde el token.** El tema claro no es un parche: cada
   rol semántico tiene su valor en los dos temas, con contraste verificado.
7. **El chrome no tapa el contenido.** Cabeceras y barra inferior son
   translúcidas, pero con contraste garantizado sobre cualquier foto.
8. **Accesibilidad no negociable.** Foco visible siempre, objetivos táctiles
   ≥ 44 px, contraste AA en texto y ≥ 3:1 en iconos y controles.

## 2. Personalidad visual

| Eje | Antes | Ahora («Lumen») |
|---|---|---|
| Tono | oscuro con grano y brillos | sobrio, preciso, con un punto cálido en el acento |
| Forma | radios dispares (17/19/27 px) | escala única de 6/10/14/18/24 px |
| Superficies | tres sistemas mezclados | cuatro planos semánticos + hairline |
| Acento | pinta todo (CTA, toast, badge, borde) | solo acción, selección y estado activo |
| Tipografía | tamaños ad hoc | escala cerrada, tracking por tamaño |
| Tema claro | heredado, sin trabajar | primera clase, mismo nivel de acabado |

La referencia de oficio es la de las apps de producto actuales: superficies
planas con bordes finos, mucha aireación, iconografía de un solo peso óptico,
microinteracciones cortas y precisas.

## 3. Arquitectura del cambio

El rediseño se aplica en cinco capas, de dentro hacia fuera. Cada capa se apoya
en la anterior, así que una mejora se propaga sin tocar pantallas:

```
0. Tokens        src/layout.css (:root, @theme)        color, tipo, radios, elevación, motion
1. Primitivas    src/lib/components/ui/**              botón, campo, tarjeta, tabs, sheet, dialog…
2. Chrome        navbar, cabeceras, subpáginas, barras  estructura repetida en toda la app
3. Pantallas     src/routes/**                         composición y jerarquía por pantalla
4. Presets       appearance/looks                      Lumen, Porcelain, Midnight, Slate
```

**Regla de oro:** si algo se puede resolver en la capa 0 o 1, no se resuelve en
la capa 3. Un cambio de radio o de color debe ser un token, nunca un valor
suelto en un `.svelte`.

## 4. Estado

- [x] Auditoría de la interfaz actual (42 rutas, ~700 componentes, tokens y deuda visual)
- [x] Sistema de diseño: fundamentos y componentes
- [x] **Capa 0 implementada**: tokens claro/oscuro, acento derivado por tema
      (tono y croma por preset, luminosidad por tema), escala tipográfica,
      radios explícitos, elevación, estados y movimiento
- [x] **Capa 2 parcial**: barra inferior (píldora, etiquetas overline, activo
      con acento suave) y acabado por slots: cabecera de chat, burbujas,
      compositor, rejilla de fotos, grupos de ajustes y toasts
- [x] Guía visual viva ([index.html](index.html)) y capturas por sección
- [x] Capturas antes/después de 16 pantallas (modo demo, varios temas)
- [x] **Capa 1**: botón base (radios por rol, variantes con tokens de
      superficie, estados con capa de estado) y chips de filtro activos con
      acento suave
- [x] **Contrastes del tema claro corregidos** al pasar a paridad claro/oscuro:
      la previsualización de las filas no leídas usaba `text-white` (invisible
      sobre blanco) y la burbuja entrante era azul fijo
- [x] **Oleada 1 completa**: chrome (barra inferior, cabeceras, segmentado de la
      bandeja), primitivas de acción, filas de conversación, rejilla de Browse,
      burbujas y compositor
- [x] **Oleada 2 (parcial)**: perfil (cabecera y despeje inferior), ajustes
      (agrupación de filas y encabezados de sección), cabeceras de subpágina,
      filas de lista y —verificado por captura— interés/toques, que ya hereda
      bien el sistema sin cambios propios
- [x] Pestaña activa del paginador de Interés: chip elevado (superficie + hairline + sombra) en vez de bloque gris plano
- [ ] Oleada 2 (resto): mapa (tiene componentes nuevos del refactor en curso),
      auth y onboarding, y la revisión visual de álbumes (capturado, aún sin revisar)
- [ ] Oleada 3: primitivas restantes, hojas/diálogos/command center y los looks de fábrica

## 5. Cómo verlo

| Qué | Cómo |
|---|---|
| Comparativa antes/después | abrir [comparativa.html](comparativa.html) |
| Guía visual viva | `bunx vite build --config design/styleguide.vite.config.mjs` y abrir `design/dist/index.html` |
| Capturas de la app | `bun scripts/design-captures.ts --label after --theme both` |
| Capturas de la guía | `bun scripts/design-styleguide-shots.ts` |

> El servidor de demo para capturas se levanta aparte, para poder reutilizarlo:
> `PUBLIC_ENABLE_DEMO=1 PUBLIC_BACKDROP_BLUR=max bunx vite dev --port 5180 --strictPort`
> y luego `bun scripts/design-captures.ts --base-url http://localhost:5180`.

