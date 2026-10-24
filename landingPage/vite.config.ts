import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Porta própria: o sistema (frontEnd) usa a 5173.
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
})
