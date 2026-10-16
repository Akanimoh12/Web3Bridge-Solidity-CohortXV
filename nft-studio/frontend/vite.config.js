import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const apiDirectory = fileURLToPath(new URL('./api', import.meta.url))

function serverlessApiPlugin() {
  return {
    name: 'nft-studio-serverless-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(
        server.config.mode,
        server.config.envDir ?? process.cwd(),
        '',
      )
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next()
        const routeName = req.url.split('?')[0].slice('/api/'.length)
        if (!/^[a-z0-9-]+$/i.test(routeName)) return next()

        const modulePath = join(apiDirectory, `${routeName}.js`)
        if (!existsSync(modulePath)) return next()

        try {
          const module = await import(pathToFileURL(modulePath).href)
          if (typeof module.default !== 'function') return next()
          await module.default(req, res)
        } catch (error) {
          console.error(`[api] /api/${routeName}:`, error?.message ?? error)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'The local API route failed.' }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serverlessApiPlugin()],
})
