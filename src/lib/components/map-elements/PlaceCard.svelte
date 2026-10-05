<script lang="ts">
	import {
		ArrowsClockwiseIcon,
		MapPinIcon,
		NavigationArrowIcon,
		TargetIcon,
		TrashIcon,
		UserIcon,
		XIcon,
	} from "phosphor-svelte";

	import UserAvatar from "$lib/components/profile/UserAvatar.svelte";
	import Button from "$lib/components/ui/button/button.svelte";
	import { t } from "$lib/i18n";

	let {
		title,
		subtitle,
		detail = null,
		mediaHash = null,
		profileId = null,
		online = false,
		refreshing = false,
		onClose,
		onOpenProfile,
		onCenter,
		onDirections,
		onRefresh,
		onDelete,
	}: {
		title: string;
		subtitle: string;
		/** A second, quieter line under the subtitle. */
		detail?: string | null;
		mediaHash?: string | null;
		/** Profile this place belongs to, when it came from triangulation. */
		profileId?: number | null;
		/** The profile is online right now. */
		online?: boolean;
		refreshing?: boolean;
		onClose: () => void;
		onOpenProfile?: (profileId: number) => void;
		onCenter?: () => void;
		onDirections?: () => void;
		onRefresh?: () => void;
		onDelete?: () => void;
	} = $props();

	const actionClass = "h-10 min-w-26 flex-1 gap-1.5 rounded-xl";
</script>

<section
	class="pointer-events-auto mx-auto flex w-full max-w-xl flex-col gap-3 overflow-hidden rounded-3xl border border-border/80 bg-card p-3 shadow-2xl"
	aria-label={title}
>
	<div class="flex items-center gap-3">
		{#if profileId !== null && onOpenProfile}
			<!-- Same action as the labelled "View profile" button below. -->
			<button
				type="button"
				tabindex="-1"
				aria-hidden="true"
				class={[
					"size-14 shrink-0 overflow-hidden rounded-2xl ring-2 transition-opacity active:opacity-80",
					{ "ring-green-500": online, "ring-border": !online },
				]}
				onclick={() => onOpenProfile(profileId)}
			>
				<UserAvatar {mediaHash} class="size-14" size="md" />
			</button>
		{:else}
			<span
				class="grid size-14 shrink-0 place-items-center rounded-2xl bg-muted text-muted-foreground"
			>
				<MapPinIcon class="size-6" weight="fill" />
			</span>
		{/if}

		<div class="min-w-0 flex-1">
			<h2
				class="flex items-center gap-1.5 text-sm leading-tight font-semibold"
			>
				<span class="truncate">{title}</span>
				{#if online}
					<span
						class="size-2 shrink-0 rounded-full bg-green-500"
						title={t("map.online")}
					></span>
					<span class="sr-only">{t("map.online")}</span>
				{/if}
			</h2>
			<p
				class="mt-0.5 line-clamp-2 text-xs break-words text-muted-foreground tabular-nums"
			>
				{subtitle}
			</p>
			{#if detail}
				<p class="truncate text-xs text-muted-foreground/80">
					{detail}
				</p>
			{/if}
		</div>

		<Button
			variant="ghost"
			size="icon"
			class="size-9 shrink-0 rounded-xl text-foreground"
			aria-label={t("common.close")}
			onclick={onClose}
		>
			<XIcon class="size-4" />
		</Button>
	</div>

	{#if onOpenProfile || onCenter || onDirections || onRefresh || onDelete}
		<div class="flex flex-wrap gap-2">
			{#if profileId !== null && onOpenProfile}
				<Button
					variant="secondary"
					size="sm"
					class={actionClass}
					data-no-dom-change
					onclick={() => onOpenProfile(profileId)}
				>
					<UserIcon class="size-4" weight="bold" />
					<span class="truncate text-xs">{t("map.viewProfile")}</span>
				</Button>
			{/if}

			{#if onCenter}
				<!-- Centering a view that is already centered changes nothing on
				     screen, so the dead-tap watchdog must not count it. -->
				<Button
					variant="secondary"
					size="sm"
					class={actionClass}
					title={t("map.centerTitle")}
					data-no-dom-change
					onclick={onCenter}
				>
					<TargetIcon class="size-4" weight="bold" />
					<span class="truncate text-xs">{t("map.center")}</span>
				</Button>
			{/if}

			{#if onDirections}
				<Button
					variant="secondary"
					size="sm"
					class={actionClass}
					data-no-dom-change
					onclick={onDirections}
				>
					<NavigationArrowIcon class="size-4" weight="fill" />
					<span class="truncate text-xs">{t("map.directions")}</span>
				</Button>
			{/if}

			{#if onRefresh}
				<Button
					variant="secondary"
					size="sm"
					class={actionClass}
					disabled={refreshing}
					onclick={onRefresh}
				>
					<ArrowsClockwiseIcon
						class={["size-4", { "animate-spin": refreshing }]}
						weight="bold"
					/>
					<span class="truncate text-xs">{t("map.refreshOne")}</span>
				</Button>
			{/if}

			{#if onDelete}
				<Button
					variant="ghost"
					size="sm"
					class={[
						actionClass,
						"text-destructive hover:bg-destructive/10 hover:text-destructive",
					]}
					onclick={onDelete}
				>
					<TrashIcon class="size-4" />
					<span class="truncate text-xs">{t("common.delete")}</span>
				</Button>
			{/if}
		</div>
	{/if}
</section>
