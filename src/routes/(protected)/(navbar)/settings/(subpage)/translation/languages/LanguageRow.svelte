<script lang="ts">
	import {
		CheckCircleIcon,
		DownloadSimpleIcon,
		TrashIcon,
	} from "phosphor-svelte";

	import { Button } from "$lib/components/ui/button";
	import { Spinner } from "$lib/components/ui/spinner";
	import { t } from "$lib/i18n";

	let {
		name,
		code,
		installed,
		required,
		busy,
		onDownload,
		onDelete,
	}: {
		name: string;
		code: string;
		installed: boolean;
		required: boolean;
		busy: "downloading" | "deleting" | undefined;
		onDownload: () => void;
		onDelete: () => void;
	} = $props();
</script>

<li class="flex items-center gap-3 px-3 py-2.5">
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium">{name}</p>
		<p class="flex items-center gap-1 text-xs text-muted-foreground">
			{#if busy === "downloading"}
				{t("translate.downloading")}
			{:else if busy === "deleting"}
				{t("translate.deleting")}
			{:else if installed}
				<CheckCircleIcon weight="fill" class="size-3.5 text-primary" />
				{required ? t("translate.required") : t("translate.installed")}
			{:else}
				{t("translate.notInstalled")}
			{/if}
			<span class="opacity-60">· {code}</span>
		</p>
	</div>
	{#if busy}
		<Spinner class="size-4" />
	{:else if installed && !required}
		<Button
			variant="ghost"
			size="icon"
			class="size-8 text-destructive"
			aria-label="{t('translate.remove')} {name}"
			title={t("translate.remove")}
			onclick={onDelete}
		>
			<TrashIcon class="size-4" />
		</Button>
	{:else if !installed}
		<Button
			variant="secondary"
			size="sm"
			aria-label="{t('translate.download')} {name}"
			onclick={onDownload}
		>
			<DownloadSimpleIcon class="size-4" />
			{t("translate.download")}
		</Button>
	{/if}
</li>
