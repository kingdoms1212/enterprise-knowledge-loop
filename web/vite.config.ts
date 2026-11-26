import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'EKL_')
  const proxy = { '/api/v1': { target: env.EKL_CORE_URL || 'http://127.0.0.1:8080' } }

  return {
    plugins: [react(), basicSsl()],
    server: { host: 'localhost', port: 5173, strictPort: true, proxy },
    preview: { host: 'localhost', proxy },
  }
})
