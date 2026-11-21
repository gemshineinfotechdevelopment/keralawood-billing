import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from src directory
  const env = loadEnv(mode, './src', '')
  const frontendPort = Number(env.VITE_PORT) || 5173

  return {
    base: '/',
    plugins: [react()],
    envDir: './src',
    server: {
      port: frontendPort,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:5031',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    success: false,
                    message: 'Backend server offline (run: npm run dev:backend or npm run dev:all)',
                  })
                )
              }
            })
          },
        },
      },
    },
  }
})
