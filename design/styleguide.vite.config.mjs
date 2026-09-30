import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

/**
 * Build aislado de la guía visual: no entra en el bundle de la app ni en las
 * rutas de SvelteKit. `bunx vite build --config design/styleguide.vite.config.mjs`
 * genera design/dist/index.html (HTML + CSS, sin JS de módulo: se puede abrir
 * directamente en el navegador).
 */
export default defineConfig({
	root: "design",
	base: "./",
	plugins: [tailwindcss()],
	build: {
		outDir: "dist",
		emptyOutDir: true,
		cssMinify: false,
	},
});
