<script lang="ts">
	import { CaretDownIcon, TranslateIcon } from "phosphor-svelte";

	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import { Spinner } from "$lib/components/ui/spinner";
	import { t } from "$lib/i18n";
	import {
		languageName,
		TRANSLATION_LANGUAGES,
	} from "$lib/translate/languages";
	import {
		type OutgoingTranslation,
		translationErrorKey,
	} from "$lib/translate/translation-state.svelte";

	let { outgoing, text }: { outgoing: OutgoingTranslation; text: string } =
		$props();

	// Re-run the live preview whenever the draft, the switch or the language changes.
	$effect(() => {
		void outgoing.active;
		void outgoing.language;
		outgoing.update(text);
	});
</script>

{#if outgoing.available}
	<div class="flex min-w-0 flex-col gap-1 px-1" data-slot="translate-bar">
		<div class="flex items-center gap-1.5 text-xs">
			<button
				type="button"
				class={[
					"inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors",
					{
						"border-primary bg-primary/15 text-foreground":
							outgoing.active,
						"border-border text-muted-foreground": !outgoing.active,
					},
				]}
				aria-pressed={outgoing.active}
				onclick={() => void outgoing.setActive(!outgoing.active)}
			>
				<TranslateIcon class="size-3.5" weight="fill" />
				{outgoing.active
					? t("translate.composerOn")
					: t("translate.composerOff")}
			</button>
			{#if outgoing.active}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1"
								aria-label={t("translate.chooseLanguage")}
								{...props}
							>
								→ {languageName(outgoing.language)}
								<CaretDownIcon class="size-3" />
							</button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="max-h-64 w-48 overflow-auto"
						align="start"
					>
						{#each TRANSLATION_LANGUAGES as language (language.code)}
							<DropdownMenu.Item
								onSelect={() =>
									void outgoing.setLanguage(language.code)}
							>
								{language.name}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
				{#if outgoing.loading}
					<Spinner class="size-3.5" />
				{/if}
			{/if}
		</div>
		{#if outgoing.active && outgoing.error}
			<p class="text-xs text-destructive" role="status">
				{t(translationErrorKey(outgoing.error))}
			</p>
		{:else if outgoing.active && outgoing.preview}
			<p
				class="rounded-xl bg-muted/60 px-3 py-1.5 text-sm wrap-anywhere whitespace-pre-wrap"
				data-slot="translate-preview"
			>
				<span
					class="block text-xs tracking-wide text-muted-foreground uppercase"
				>
					{t("translate.previewLabel")}
				</span>
				{outgoing.preview}
			</p>
		{/if}
	</div>
{/if}
