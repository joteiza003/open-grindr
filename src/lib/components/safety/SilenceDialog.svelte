<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { t } from "$lib/i18n";
	import {
		SILENCE_DURATIONS,
		type SilenceDurationId,
		type SilenceKind,
	} from "$lib/safety/temporary-silence";

	let {
		open = $bindable(false),
		kind,
		onChoose,
	}: {
		open: boolean;
		kind: SilenceKind;
		onChoose: (duration: SilenceDurationId) => void;
	} = $props();

	const durationLabel: Record<SilenceDurationId, () => string> = {
		"1h": () => t("silence.d1h"),
		"8h": () => t("silence.d8h"),
		"24h": () => t("silence.d24h"),
		"7d": () => t("silence.d7d"),
	};
</script>

<ResponsiveDialog.Root bind:open>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="sm:max-w-sm"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title>
				{kind === "mute"
					? t("silence.muteTitle")
					: t("silence.hideTitle")}
			</ResponsiveDialog.Title>
			<ResponsiveDialog.Description>
				{kind === "mute"
					? t("silence.muteHint")
					: t("silence.hideHint")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="silence-durations"
			class="flex flex-col gap-2"
			drawerClass="px-4 pb-4"
		>
			{#each SILENCE_DURATIONS as duration (duration.id)}
				<Button
					variant="secondary"
					class="w-full justify-start"
					onclick={() => {
						open = false;
						onChoose(duration.id);
					}}
				>
					{durationLabel[duration.id]()}
				</Button>
			{/each}
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
