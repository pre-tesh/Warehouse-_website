import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Listen on the LAN so a tablet/phone on the same WiFi can open the dashboard
  server:  { host: true, port: 5173 },
  preview: { host: true, port: 5173 },
})
