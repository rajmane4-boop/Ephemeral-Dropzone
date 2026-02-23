import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()]
    },
    preload: {
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        root: resolve('src/renderer'),
        build: {
            rollupOptions: {
                input: resolve('src/renderer/index.html')
            }
        },
        plugins: [tailwindcss(), svelte()]
    }
})
