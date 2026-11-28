import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), 'EKL_')
  const localCore = 'http://127.0.0.1:8080'
  const target = env.EKL_CORE_URL || localCore
  const demoPassword = command === 'serve' && !isPreview && target === localCore ? env.EKL_LOCAL_DEMO_PASSWORD : undefined
  const proxy = { '/api/v1': { target } }
  const devProxy: Record<string, ProxyOptions> = {}

  if (demoPassword) {
    const credentials = JSON.stringify({
      organization_id: '82000000-0000-0000-0000-000000000001',
      employee_number: '00042',
      password: demoPassword,
    })
    devProxy['^/api/v1/local-demo/session$'] = {
      target: localCore,
      rewrite: () => '/api/v1/sessions',
      bypass(request) {
        const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress ?? '')
        const host = request.headers.host ?? request.headers[':authority']
        if (request.method !== 'POST' || !loopback || typeof host !== 'string' || !/^localhost:\d+$/.test(host)
          || request.headers.origin !== 'https://' + host || request.headers['transfer-encoding']
          || Number(request.headers['content-length'] ?? 0) !== 0) return false
      },
      configure(proxyServer) {
        proxyServer.on('proxyReq', (outgoing) => {
          outgoing.setHeader('Content-Type', 'application/json')
          outgoing.setHeader('Content-Length', Buffer.byteLength(credentials))
          outgoing.write(credentials)
        })
      },
    }
  }

  return {
    plugins: [react(), basicSsl()],
    define: { 'import.meta.env.EKL_LOCAL_DEMO_LOGIN': JSON.stringify(Boolean(demoPassword)) },
    server: { host: 'localhost', port: 5173, strictPort: true, proxy: { ...devProxy, ...proxy } },
    preview: { host: 'localhost', proxy },
  }
})
