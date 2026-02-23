import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
    // Snippet CRUD
    saveSnippet: (data) => ipcRenderer.invoke('save-snippet', data),
    getSnippets: () => ipcRenderer.invoke('get-snippets'),
    searchSnippets: (query) => ipcRenderer.invoke('search-snippets', query),
    deleteSnippet: (id) => ipcRenderer.invoke('delete-snippet', id),
    deleteAll: () => ipcRenderer.invoke('delete-all-snippets'),
    savePermanent: (id) => ipcRenderer.invoke('save-permanent', id),
    readLocalImage: (filePath) => ipcRenderer.invoke('read-local-image', filePath),
    getDockSide: () => ipcRenderer.invoke('get-dock-side'),
    setDockSide: (side) => ipcRenderer.invoke('set-dock-side', side),
    clipboardReadHtml: () => ipcRenderer.invoke('clipboard-read-html'),
    clipboardWriteHtml: (data) => ipcRenderer.invoke('clipboard-write-html', data),

    // Window control
    expand: () => ipcRenderer.send('expand'),
    collapse: () => ipcRenderer.send('collapse'),
    exitApp: () => ipcRenderer.send('quit-app'),

    // Events from main
    onDoomsday: (callback) => {
        ipcRenderer.on('doomsday', () => callback())
    },
    onHotkeySearch: (callback) => {
        ipcRenderer.on('hotkey-search', () => callback())
    }
})
