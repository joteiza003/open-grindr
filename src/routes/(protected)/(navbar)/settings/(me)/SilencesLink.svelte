<script lang="ts">
	import { CaretRightIcon, TimerIcon } from "phosphor-svelte";

	import * as Item from "$lib/components/ui/item";
	import { t } from "$lib/i18n";
</script>

<Item.Root variant="outline">
	{#snippet child({ props })}
		<a href="/settings/silences" {...props}>
			<Item.Media>
				<TimerIcon weight="fill" class="size-5" />
			</Item.Media>
			<Item.Content class="min-w-0">
				<Item.Title
					class="inline-block w-full min-w-0 truncate text-left"
				>
					{t("silence.title")}
				</Item.Title>
			</Item.Content>
			<Item.Actions>
				<CaretRightIcon class="size-4" />
			</Item.Actions>
		</a>
	{/snippet}
</Item.Root>
