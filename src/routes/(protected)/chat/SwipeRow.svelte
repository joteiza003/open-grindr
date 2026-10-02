<script lang="ts">
	import {
		BellSimpleSlashIcon,
		PushPinIcon,
		TrashIcon,
	} from "phosphor-svelte";
	import type { Snippet } from "svelte";

	import {
		SWIPE_TRIGGER_PX,
		type SwipeAction,
		swipeIntent,
		swipeOffset,
		swipeResult,
	} from "$lib/chat/swipe-actions";
	import { playHaptic } from "$lib/haptics";
	import { t } from "$lib/i18n";

	let {
		actions,
		onAction,
		children,
	}: {
		actions: { left: SwipeAction; right: SwipeAction };
		onAction: (action: Exclude<SwipeAction, "none">) => void;
		children: Snippet;
	} = $props();

	let dx = $state(0);
	let dragging = $state(false);
	let startX = 0;
	let startY = 0;
	let intent: "undecided" | "horizontal" | "vertical" = "undecided";
	let armed = false;

	const offset = $derived(swipeOffset(dx));
	// Qué acción se ve detrás: la del lado hacia el que se arrastra.
	const shown = $derived(
		dx > 0 ? actions.right : dx < 0 ? actions.left : "none",
	);
	const reached = $derived(
		Math.abs(dx) >= SWIPE_TRIGGER_PX && shown !== "none",
	);

	const labels: Record<Exclude<SwipeAction, "none">, () => string> = {
		pin: () => t("chat.swipe.pin"),
		mute: () => t("chat.swipe.mute"),
		delete: () => t("chat.swipe.delete"),
	};

	function onPointerDown(event: PointerEvent) {
		// El ratón no desliza filas: allí están el menú contextual y los botones.
		if (event.pointerType === "mouse" || !event.isPrimary) return;
		if (actions.left === "none" && actions.right === "none") return;
		startX = event.clientX;
		startY = event.clientY;
		intent = "undecided";
		armed = false;
		dragging = true;
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging || intent === "vertical") return;
		const moveX = event.clientX - startX;
		const moveY = event.clientY - startY;
		if (intent === "undecided") {
			intent = swipeIntent({ dx: moveX, dy: moveY });
			if (intent === "horizontal") {
				(event.currentTarget as HTMLElement).setPointerCapture(
					event.pointerId,
				);
			}
			if (intent !== "horizontal") return;
		}
		dx = moveX;
		const nowReached = swipeResult({ dx: moveX, actions }) !== null;
		if (nowReached && !armed) playHaptic("longPress");
		armed = nowReached;
	}

	function finish(commit: boolean) {
		if (!dragging) return;
		dragging = false;
		const action = commit ? swipeResult({ dx, actions }) : null;
		const swiped = intent === "horizontal";
		dx = 0;
		intent = "undecided";
		if (swiped) suppressClick = true;
		if (action !== null) onAction(action);
	}

	// Un deslizado no debe abrir la conversación al soltar el dedo.
	let suppressClick = false;
	function onClickCapture(event: MouseEvent) {
		if (!suppressClick) return;
		suppressClick = false;
		event.preventDefault();
		event.stopPropagation();
	}
</script>

<div
	data-slot="swipe-row"
	role="presentation"
	class="relative touch-pan-y overflow-hidden rounded-2xl"
	onpointerdowncapture={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={() => finish(true)}
	onpointercancel={() => finish(false)}
	onclickcapture={onClickCapture}
>
	{#if shown !== "none"}
		<div
			aria-hidden="true"
			class={[
				"absolute inset-0 flex items-center px-5 text-sm font-medium transition-colors",
				{
					"justify-start": dx > 0,
					"justify-end": dx <= 0,
					"bg-destructive text-white": shown === "delete" && reached,
					"bg-destructive/20 text-destructive":
						shown === "delete" && !reached,
					"bg-primary text-primary-foreground":
						shown !== "delete" && reached,
					"bg-primary/15 text-primary":
						shown !== "delete" && !reached,
				},
			]}
		>
			<span class="flex items-center gap-2">
				{#if shown === "pin"}
					<PushPinIcon weight="fill" class="size-5" />
				{:else if shown === "mute"}
					<BellSimpleSlashIcon weight="fill" class="size-5" />
				{:else}
					<TrashIcon weight="fill" class="size-5" />
				{/if}
				{labels[shown]()}
			</span>
		</div>
	{/if}
	<div
		class="relative bg-background"
		style:transform="translateX({offset}px)"
		style:transition={dragging
			? "none"
			: "transform 220ms var(--ease-spring)"}
	>
		{@render children()}
	</div>
</div>
