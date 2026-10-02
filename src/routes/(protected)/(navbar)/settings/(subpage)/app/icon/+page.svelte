<script lang="ts">
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";

	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { t } from "$lib/i18n";
	import { APP_ICON_IDS, type AppIconId } from "$lib/platform/app-icon";
	import { AppIconState } from "$lib/platform/app-icon.svelte";
	import type { MessageKey } from "$lib/i18n";
	import IconOption from "./IconOption.svelte";

	const icons = new AppIconState();

	const NAME_KEYS: Record<AppIconId, MessageKey> = {
		default: "icon.default",
		calculator: "icon.calculator",
		notes: "icon.notes",
		weather: "icon.weather",
		clock: "icon.clock",
	};

	let pending = $state<AppIconId | null>(null);
	let confirmOpen = $state(false);

	onMount(() => {
		void icons.load();
	});

	function nameOf(id: AppIconId): string {
		return t(NAME_KEYS[id]);
	}

	function choose(id: AppIconId) {
		if (id === icons.current || icons.busy) return;
		// Going back to the normal icon needs no warning; a disguise does.
		if (id === "default") {
			void apply(id);
			return;
		}
		pending = id;
		confirmOpen = true;
	}

	async function apply(id: AppIconId) {
		const error = await icons.choose(id);
		if (error === null) {
			toast.success(t("icon.changed", { name: nameOf(id) }));
		} else {
			toast.error(t("icon.failed"));
		}
	}

	async function confirm() {
		const id = pending;
		confirmOpen = false;
		pending = null;
		if (id !== null) await apply(id);
	}
</script>

<h1 class="truncate ps-4 text-xl font-semibold tracking-tight">
	{t("icon.title")}
</h1>

{#if !icons.available}
	<p
		class="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
	>
		{t("icon.androidOnly")}
	</p>
{:else}
	<p class="px-4 text-sm text-muted-foreground">{t("icon.intro")}</p>

	{#if icons.loading}
		<div class="flex flex-col gap-2">
			{#each APP_ICON_IDS as id (id)}
				<Skeleton class="h-18 w-full rounded-xl" />
			{/each}
		</div>
	{:else}
		<div
			class="flex flex-col gap-2"
			role="radiogroup"
			aria-label={t("icon.title")}
		>
			{#each APP_ICON_IDS as id (id)}
				<IconOption
					{id}
					name={nameOf(id)}
					selected={icons.current === id}
					disabled={icons.busy}
					onChoose={() => choose(id)}
				/>
			{/each}
		</div>
		<p class="px-4 text-xs text-muted-foreground">{t("icon.limits")}</p>
	{/if}
{/if}

<AlertDialog.Root bind:open={confirmOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{t("icon.confirmTitle")}</AlertDialog.Title>
			<AlertDialog.Description>
				{t("icon.confirmBody", {
					name: pending === null ? "" : nameOf(pending),
				})}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel size="lg">
				{t("common.cancel")}
			</AlertDialog.Cancel>
			<AlertDialog.Action size="lg" onclick={() => void confirm()}>
				{t("icon.confirm")}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
