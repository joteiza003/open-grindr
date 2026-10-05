<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";
	import type {
		HTMLAnchorAttributes,
		HTMLButtonAttributes,
	} from "svelte/elements";

	import { cn, type WithElementRef } from "$lib/util/utils.js";

	export const buttonVariants = tv({
		base: "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-label font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-38 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary/85 active:bg-primary/75",
				outline:
					"border-border bg-transparent text-foreground hover:bg-(--state-hover) aria-expanded:bg-(--state-hover) aria-expanded:text-foreground",
				secondary:
					"border-border bg-raised text-foreground hover:bg-(--state-hover) aria-expanded:bg-(--state-hover) aria-expanded:text-foreground",
				ghost:
					"text-secondary hover:bg-(--state-hover) hover:text-foreground aria-expanded:bg-(--state-hover) aria-expanded:text-foreground",
				destructive:
					"bg-(--danger-soft) text-(--danger-text) hover:bg-danger/25 focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
				link: "text-(--accent-text) underline-offset-4 hover:underline",
			},
			size: {
				default:
					"h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
				xs: "h-6 gap-1 rounded-sm px-2.5 text-caption has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
				icon: "size-9 rounded-full",
				"icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8 rounded-full",
				"icon-lg": "size-10 rounded-full",
			},
		},
		defaultVariants: { variant: "default", size: "default" },
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
