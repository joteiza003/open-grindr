<script lang="ts">
	import { CaretRightIcon, SparkleIcon } from "phosphor-svelte";

	import * as Item from "$lib/components/ui/item";
	import { t } from "$lib/i18n";
	import { whatsNew } from "$lib/whats-new/state.svelte";
</script>

<Item.Root variant="outline">
	{#snippet child({ props })}
		<button type="button" {...props} onclick={() => (whatsNew.open = true)}>
			<Item.Media>
				<SparkleIcon weight="fill" class="size-5" />
			</Item.Media>
			<Item.Content class="min-w-0">
				<Item.Title
					class="inline-block w-full min-w-0 truncate text-left"
				>
					{t("whatsNew.title")}
				</Item.Title>
			</Item.Content>
			<Item.Actions>
				<CaretRightIcon class="size-4" />
			</Item.Actions>
		</button>
	{/snippet}
</Item.Root>
