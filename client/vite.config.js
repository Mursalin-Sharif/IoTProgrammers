import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Load built CSS without blocking first paint (critical CSS stays inline in index.html). */
function asyncCssPlugin() {
  return {
    name: 'async-css',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(/<link\s+rel="stylesheet"([^>]*?)>/g, (_match, attrs) => {
        const cleaned = String(attrs || '').replace(/\s*\/?\s*$/, '')
        return [
          `<link rel="preload" as="style"${cleaned} onload="this.onload=null;this.rel='stylesheet'">`,
          `<noscript><link rel="stylesheet"${cleaned}></noscript>`,
        ].join('')
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), asyncCssPlugin()],
  build: {
    // Avoid preloading deferred chunks (gsap/swiper) on first paint.
    modulePreload: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('swiper')) return 'swiper'
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('react-router')) return 'router'
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
          return 'vendor'
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/uploads': 'http://127.0.0.1:5000',
    },
  },
})
