<script lang="ts">
	import { ChatCircleSlashIcon, FunnelIcon } from "phosphor-svelte";

	import * as Empty from "$lib/components/ui/empty";
	import { t } from "$lib/i18n";

	let { filtered = false }: { filtered?: boolean } = $props();

	const Icon = $derived(filtered ? FunnelIcon : ChatCircleSlashIcon);
</script>

<Empty.Root class="px-6">
	<Empty.Header>
		<Empty.Media variant="icon" class="size-16 rounded-full bg-muted/60">
			<Icon weight="fill" class="size-7 text-muted-foreground" />
		</Empty.Media>
		{#if filtered}
			<Empty.Title class="font-heading"
				>{t("empty.chatsFilteredTitle")}</Empty.Title
			>
			<Empty.Description>{t("empty.chatsFilteredBody")}</Empty.Description
			>
		{:else}
			<Empty.Title class="font-heading"
				>{t("empty.chatsTitle")}</Empty.Title
			>
			<Empty.Description>
				Browse
				<a
					href="/"
					class="text-primary underline-offset-4 hover:underline"
				>
					Grid
				</a>
				to find people to chat with.
			</Empty.Description>
		{/if}
	</Empty.Header>
</Empty.Root>
