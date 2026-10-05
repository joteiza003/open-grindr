# Dependency patches

Applied on `bun install`.

## `@sveltejs/kit`

Sorts the five `fs.readdirSync()` calls whose order decides build output, so a rebuild elsewhere produces the same bytes.

See [sveltejs/kit#15313](https://github.com/sveltejs/kit/issues/15313). [#16074](https://github.com/sveltejs/kit/pull/16074) is `version-3` only and sorts one of the five, so the patch outlives a v3 upgrade.

`patchedDependencies` is linked to exact version, and bun silently drops an entry that no longer resolves, so a SvelteKit version bump disables this patch. Re-apply with `bun patch`, replace the old key, confirm `bun.lock` still lists it.

## `vaul-svelte`

Drawers bounced back into view during the close animation. A `pointerout` that ended a drag while the pointer was still captured and a `swipeAmount` of `0` read as absent.

See ([huntabyte/vaul-svelte#138](https://github.com/huntabyte/vaul-svelte/issues/138)).

## `svelte-sonner`

A toast stacked itself behind every other toast on screen, not just the ones sharing its position, so a `bottom-center` toast pushed a `top-center` toast down by its own height plus the gap. `heights` is one global array and `HeightT` carries no position, so `toastsHeightBefore` summed across positions; upstream React sonner filters that list by position. The patch records the position with each measured height and filters on it.

## `bits-ui`

Dropdown and context menu items ignored a hovering pen. Every menu hover handler returns early unless `pointerType` is `"mouse"`, so an S Pen never focused an item, opened a submenu or kept the submenu grace area. The patch adds `isHoverPointerEvent()`, true for a mouse or for a pen with no buttons pressed, and uses it in those handlers. A pen on the glass or holding its barrel button still acts like touch, so pen scrolling does not move focus. The context menu trigger's long-press keeps `isMouseEvent()`: `pointerup` carries no buttons, so a pen-inclusive check would skip clearing the 700 ms timer and every pen tap would open the menu.

Radix has the same mouse-only gate, see [radix-ui/primitives#1403](https://github.com/radix-ui/primitives/issues/1403).

## `svelte`

A new batch could stay unflushed for good. `Batch.ensure()` only schedules a flush when no batch is being processed or flushed synchronously, and relies on the tail of `#process()` to pick up a batch created meanwhile. When the batch that was processing leaves early by merging into an earlier one, that pickup never happens: the new batch stays unstarted, later batches merge into it, and part of the UI stops updating while state and DOM disagree. There is no error, and `flushSync()` and `tick()` do not recover it. A screen stuck like this ignores every button that changes state while a plain external link keeps working, which is how the map screen failed on a phone; the bug itself was only reproduced with the upstream test case, not on the map.

The patch always schedules the flush. If the tail already picked the batch up, `#started` is true and the microtask does nothing. It also sets `globalThis.__svelte_batch_patched`, which the map diagnostics report reads to say whether a build carries the patch.

See [sveltejs/svelte#18761](https://github.com/sveltejs/svelte/issues/18761), reproduced on 5.57.0 (5 of 5 runs fail without the patch, none with it), and [#18546](https://github.com/sveltejs/svelte/issues/18546). The upstream fixes ([#18558](https://github.com/sveltejs/svelte/pull/18558), [#18861](https://github.com/sveltejs/svelte/pull/18861)) are not in a release yet; drop the patch once one ships. It is linked to the exact version, so a Svelte bump disables it: check `patchedDependencies` in `bun.lock` afterwards.
