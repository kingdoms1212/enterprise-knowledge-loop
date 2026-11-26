import { defineConfig } from '@playwright/test'

const baseURL = 'https://localhost:5177'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    channel: process.env.EKL_TEST_BROWSER || (process.platform === 'win32' ? 'msedge' : undefined),
  },
  webServer: {
    command: 'npm run dev -- --port 5177',
    url: baseURL,
    ignoreHTTPSErrors: true,
    timeout: 30_000,
  },
})
