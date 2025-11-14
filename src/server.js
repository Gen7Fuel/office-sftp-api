// filepath: office-sftp-api/src/server.js
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const sftpRoutes = require('./routes/sftpRoutes')

const app = express()
const PORT = Number(process.env.PORT || 5000)
const API_TOKEN = process.env.API_TOKEN || ''
const ALLOW_ORIGINS = (process.env.ALLOW_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(express.json())

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOW_ORIGINS.length === 0) return cb(null, true)
      if (ALLOW_ORIGINS.includes(origin)) return cb(null, true)
      return cb(new Error('Not allowed by CORS'))
    }
  })
)

// Bearer token auth
app.use((req, res, next) => {
  if (!API_TOKEN) return next()
  const auth = req.headers.authorization || ''
  if (auth === `Bearer ${API_TOKEN}`) return next()
  return res.status(401).json({ error: 'Unauthorized' })
})

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/sftp', sftpRoutes)

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err?.message || err)
  res.status(500).json({ error: 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Office SFTP API listening on :${PORT}`)
})
