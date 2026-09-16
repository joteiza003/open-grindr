<script lang="ts">
	import ChatBackground from "$lib/appearance/ChatBackground.svelte";
</script>

<div
	class="relative h-36 w-full overflow-hidden rounded-2xl border border-border bg-card"
	aria-hidden="true"
>
	<ChatBackground />
	<div class="relative z-10 flex h-full flex-col justify-end gap-2 p-3">
		<div class="flex">
			<span
				class="max-w-[75%] rounded-xl rounded-es-none bg-message-bubble-in px-3 py-1.5 text-sm text-message-bubble-in-foreground"
			>
				Hey there 👋
			</span>
		</div>
		<div class="flex justify-end">
			<span
				class="max-w-[75%] rounded-xl rounded-ee-none bg-message-bubble-out px-3 py-1.5 text-sm text-message-bubble-out-foreground"
			>
				Looking good!
			</span>
		</div>
	</div>
</div>
