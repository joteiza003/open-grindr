<script lang="ts">
	import { goto } from "$app/navigation";

	import {
		preferencesLoaded,
		preferencesSnapshot,
		setPreferences,
	} from "$lib/app-data/preferences.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as ResponsiveDialog from "$lib/components/ui/responsive-dialog";
	import { t } from "$lib/i18n";
	import { whatsNew } from "$lib/whats-new/state.svelte";
	import {
		shouldShowWhatsNew,
		WHATS_NEW_ENTRIES,
		WHATS_NEW_VERSION,
	} from "$lib/whats-new/entries";

	// Se abre sola una vez por versión; también se puede abrir desde Ajustes.
	$effect(() => {
		if (!preferencesLoaded()) return;
		const { whatsNewSeen, onboardingComplete } = preferencesSnapshot();
		if (shouldShowWhatsNew({ seen: whatsNewSeen, onboardingComplete })) {
			whatsNew.open = true;
		}
	});

	function onOpenChange(next: boolean) {
		whatsNew.open = next;
		if (!next) markSeen();
	}

	function markSeen() {
		if (preferencesSnapshot().whatsNewSeen === WHATS_NEW_VERSION) return;
		setPreferences({ whatsNewSeen: WHATS_NEW_VERSION }).catch(
			console.error,
		);
	}

	function visit(href: string) {
		whatsNew.open = false;
		markSeen();
		void goto(href);
	}
</script>

<ResponsiveDialog.Root bind:open={() => whatsNew.open, onOpenChange}>
	<ResponsiveDialog.Content
		class="flex flex-col"
		dialogClass="max-h-[calc(var(--screen-safe)-4rem)] sm:max-w-md"
		drawerClass="max-h-screen-safe"
		dialogProps={{ showCloseButton: true }}
	>
		<ResponsiveDialog.Header class="pb-2">
			<ResponsiveDialog.Title
				>{t("whatsNew.title")}</ResponsiveDialog.Title
			>
			<ResponsiveDialog.Description>
				{t("whatsNew.intro")}
			</ResponsiveDialog.Description>
		</ResponsiveDialog.Header>
		<ResponsiveDialog.Body
			data-slot="whats-new"
			class="flex flex-col gap-2"
			dialogClass="-mx-1 px-1"
			drawerClass="px-4 pb-4"
		>
			<ul class="flex flex-col gap-2">
				{#each WHATS_NEW_ENTRIES as entry (entry.id)}
					<li
						class="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
					>
						<div class="flex min-w-0 flex-col gap-0.5">
							<span class="text-sm font-semibold"
								>{t(entry.title)}</span
							>
							<span class="text-xs text-muted-foreground"
								>{t(entry.body)}</span
							>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onclick={() => visit(entry.href)}
						>
							{t("whatsNew.open")}
						</Button>
					</li>
				{/each}
			</ul>
			<Button class="mt-2 w-full" onclick={() => onOpenChange(false)}>
				{t("whatsNew.close")}
			</Button>
		</ResponsiveDialog.Body>
	</ResponsiveDialog.Content>
</ResponsiveDialog.Root>
