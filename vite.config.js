import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from src directory
  const env = loadEnv(mode, './src', '')
  const frontendPort = Number(env.VITE_PORT) || 5173

  return {
    plugins: [react()],
    envDir: './src',
    server: {
      port: frontendPort,
    },
  }
})
