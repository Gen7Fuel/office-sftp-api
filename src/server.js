require('dotenv').config()
const express = require('express')
const sftpRoutes = require('./routes/sftpRoutes')

const app = express()
const PORT = Number(process.env.PORT || 5000)

app.use(express.json())

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/sftp', sftpRoutes)

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err?.message || err)
  res.status(500).json({ error: 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Office SFTP API listening on :${PORT}`)
})
