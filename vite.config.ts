import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { getEarthquakes } from './api/earthquakeService.js'

export default defineConfig({
  plugins: [
      {
        name: 'earthquakes-api-dev',
        configureServer(server) {
          server.middlewares.use('/api/earthquakes', async (req, res) => {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            if (req.method !== 'GET') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ ok: false, message: 'Metodo no permitido. Usa GET.', events: [] }))
              return
            }

            const result = await getEarthquakes(req.url || '/api/earthquakes')
            res.statusCode = result.status
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            res.setHeader('Cache-Control', 's-maxage=90, stale-while-revalidate=180')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(result.body))
          })
        },
      },
      tailwindcss(),
      react(),
  ],
})
