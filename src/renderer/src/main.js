import './assets/app.css'
import App from './App.svelte'
import { mount } from 'svelte'

// ── Prevent Electron from navigating on external drag-and-drop ──
// Only preventDefault — do NOT stopPropagation, or our DropZone handler won't fire.
document.addEventListener('dragover', (e) => {
    e.preventDefault()
})

document.addEventListener('drop', (e) => {
    e.preventDefault()
})

// ── Safety net: always reset drag state when drag ends ──
document.addEventListener('dragend', () => {
    document.dispatchEvent(new CustomEvent('drag-reset'))
})

const app = mount(App, {
    target: document.getElementById('app')
})
