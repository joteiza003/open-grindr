<script lang="ts">
	import { DomEvent, type LeafletMouseEvent } from "leaflet";
	import { Circle, Marker, Tooltip } from "sveaflet";

	import { t } from "$lib/i18n";
	import {
		CIRCLE_FILL_OPACITY,
		CIRCLE_SELECTED_WEIGHT,
		CIRCLE_STROKE_OPACITY,
		CIRCLE_WEIGHT,
		convertKmToMeters,
		destinationPoint,
		formatDistanceKm,
		radiusPixels,
	} from "$lib/map/geographic";
	import { dotIcon, handleIcon } from "$lib/map/map-icons";
	import type { MapElementsState } from "$lib/map/map-elements-state.svelte";
	import type { MapCircle } from "$lib/model/map-elements";

	let {
		overlays,
		zoom,
		picking,
		locale,
	}: {
		overlays: MapElementsState;
		zoom: number;
		picking: boolean;
		locale: string;
	} = $props();

	// Big circles first so smaller ones stay on top and remain clickable.
	const sortedCircles = $derived(
		[...overlays.circles].sort((a, b) => b.radiusKm - a.radiusKm),
	);

	// While editing, the draft (moved / resized live) replaces the stored circle.
	function liveCircle(circle: MapCircle) {
		const current = overlays.circleDraft;
		if (current?.id === circle.id) {
			return { ...circle, ...current, name: current.name || undefined };
		}
		return circle;
	}

	const draft = $derived(overlays.circleDraft);
	const resizeHandle = $derived(
		draft
			? destinationPoint(draft, 90, convertKmToMeters(draft.radiusKm))
			: null,
	);

	type DragEvent = {
		target: {
			getLatLng: () => { wrap: () => { lat: number; lng: number } };
		};
	};

	function circleLabel(circle: { name?: string; radiusKm: number }): string {
		const radius = formatDistanceKm(circle.radiusKm, locale);
		return circle.name ? `${circle.name} · ${radius}` : radius;
	}
</script>

{#each sortedCircles as circle (circle.id)}
	{@const live = liveCircle(circle)}
	{@const selected =
		circle.id === overlays.selectedCircleId ||
		overlays.circleDraft?.id === circle.id}
	{@const pixels = radiusPixels(live.radiusKm, live.latitude, zoom)}
	<Circle
		latLng={[live.latitude, live.longitude]}
		options={{
			radius: convertKmToMeters(live.radiusKm),
			color: live.color,
			weight: selected ? CIRCLE_SELECTED_WEIGHT : CIRCLE_WEIGHT,
			opacity: CIRCLE_STROKE_OPACITY,
			fillColor: live.color,
			fillOpacity: CIRCLE_FILL_OPACITY,
			dashArray: selected ? "8 5" : undefined,
		}}
		onclick={(event: LeafletMouseEvent) => {
			DomEvent.stopPropagation(event);
			if (picking) {
				overlays.handleMapClick(event.latlng.lat, event.latlng.lng);
				return;
			}
			overlays.selectCircle(circle.id);
		}}
	>
		{#if (live.name || selected) && pixels > 36}
			<Tooltip
				options={{
					permanent: true,
					direction: "center",
					className: "map-circle-label",
					opacity: 0.9,
				}}
			>
				{circleLabel(live)}
			</Tooltip>
		{/if}
	</Circle>
	{#if pixels < 12 && !picking}
		<Marker
			latLng={[live.latitude, live.longitude]}
			options={{
				icon: dotIcon(live.color),
				title: circleLabel(live),
				zIndexOffset: 300,
			}}
			onclick={(event: LeafletMouseEvent) => {
				DomEvent.stopPropagation(event);
				overlays.selectCircle(circle.id);
			}}
		/>
	{/if}
{/each}

{#if overlays.circleDraft && !overlays.circleDraft.id}
	<Circle
		latLng={[overlays.circleDraft.latitude, overlays.circleDraft.longitude]}
		options={{
			radius: convertKmToMeters(overlays.circleDraft.radiusKm),
			color: overlays.circleDraft.color,
			weight: CIRCLE_WEIGHT,
			opacity: CIRCLE_STROKE_OPACITY,
			fillColor: overlays.circleDraft.color,
			fillOpacity: CIRCLE_FILL_OPACITY,
			dashArray: "6 4",
		}}
	/>
{/if}

{#if draft && resizeHandle}
	<Marker
		latLng={[draft.latitude, draft.longitude]}
		options={{
			icon: handleIcon(draft.color, 22, false),
			draggable: true,
			title: t("map.moveHandle"),
			zIndexOffset: 1200,
		}}
		ondrag={(event: DragEvent) => {
			const point = event.target.getLatLng().wrap();
			overlays.moveCircleDraft(point.lat, point.lng);
		}}
	/>
	<Marker
		latLng={[resizeHandle.latitude, resizeHandle.longitude]}
		options={{
			icon: handleIcon(draft.color, 20, true),
			draggable: true,
			title: t("map.resizeHandle"),
			zIndexOffset: 1300,
		}}
		ondrag={(event: DragEvent) => {
			const point = event.target.getLatLng().wrap();
			overlays.resizeCircleDraftTo(point.lat, point.lng);
		}}
	/>
{/if}
