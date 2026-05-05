import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'pg': path.resolve(__dirname, './src/mocks/pg-mock.js'),
      'node-fasttext': path.resolve(__dirname, './src/mocks/node-fasttext-mock.js'),
      'fastembed': path.resolve(__dirname, './src/mocks/fastembed-mock.js'),
      '@xenova/transformers': path.resolve(__dirname, './src/mocks/transformers-mock.js'),
      'fs': path.resolve(__dirname, './src/mocks/fs-mock.js'),
      'node:fs': path.resolve(__dirname, './src/mocks/fs-mock.js'),
      'fs/promises': path.resolve(__dirname, './src/mocks/fs-promises-mock.js'),
      'path': path.resolve(__dirname, './src/mocks/path-mock.js'),
      'crypto': path.resolve(__dirname, './src/mocks/crypto-mock.js'),
      'events': path.resolve(__dirname, './src/mocks/events-mock.js'),
      'child_process': path.resolve(__dirname, './src/mocks/child-process-mock.js'),
      'stream': path.resolve(__dirname, './src/mocks/stream-mock.js'),
      'mysql2': path.resolve(__dirname, './src/mocks/mysql2-mock.js'),
      'mysql2/promise': path.resolve(__dirname, './src/mocks/mysql2-promise-mock.js'),
      'formdata-node/file-from-path': path.resolve(__dirname, './src/mocks/formdata-mock.js'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true,
      },
    },
    fs: {
      // Exclude crewai-ts from dev server file system
      allow: ['..'],
      deny: ['node_modules/crewai-ts'],
    },
  },
  preview: {
    port: 3000,
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
    Buffer: 'globalThis.Buffer',
  },
  optimizeDeps: {
    exclude: ['crewai-ts', 'node-fasttext', 'fastembed', '@xenova/transformers', 'pg', 'fs', 'node:fs', 'fs/promises', 'path', 'crypto', 'events', 'child_process', 'stream', 'mysql2', 'mysql2/promise', 'formdata-node/file-from-path'],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['crewai-ts'],
    },
  },
})
