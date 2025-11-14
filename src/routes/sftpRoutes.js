// filepath: office-sftp-api/src/routes/sftpRoutes.js
const express = require('express')
const { withSftp } = require('../utils/sftp')
const { getSftpConfig } = require('../config/sftpConfig')

const router = express.Router()

// GET /api/sftp/receive?site=SITE&type=sft|br
router.get('/receive', async (req, res) => {
  const { site } = req.query
  const type = (req.query.type || 'sft').toString().toLowerCase()
  const extNoDot = type === 'br' ? 'br' : 'sft'
  const ext = `.${extNoDot}`

  if (!getSftpConfig(site)) {
    return res.status(400).json({ error: `No SFTP credentials configured for site: ${site || '(missing)'}` })
  }

  try {
    const files = await withSftp(site, async (sftp) => {
      const remoteDir = '/receive'
      const list = await sftp.list(remoteDir)
      return list
        .filter((f) => typeof f.name === 'string' && f.name.toLowerCase().endsWith(ext))
        .sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' }))
        .map((f) => ({
          name: f.name,
          size: f.size,
          modifyTime: f.modifyTime,
          accessTime: f.accessTime,
          type: f.type,
          path: `${remoteDir}/${f.name}`
        }))
    })
    res.json({ files })
  } catch (err) {
    const msg = err?.message || String(err)
    const code = err?.code
    console.error('SFTP list error:', code, msg)
    if (code === 'CONFIG') return res.status(400).json({ error: msg })
    if (code === 'ECONNREFUSED') return res.status(502).json({ error: 'SFTP connection refused' })
    if (code === 'ETIMEDOUT') return res.status(504).json({ error: 'SFTP connection timed out' })
    res.status(500).json({ error: 'Failed to list files' })
  }
})

// GET /api/sftp/receive/:shift?site=SITE&type=sft|br
router.get('/receive/:shift', async (req, res) => {
  const { site } = req.query
  const type = (req.query.type || 'sft').toString().toLowerCase()
  const extNoDot = type === 'br' ? 'br' : 'sft'
  const ext = `.${extNoDot}`
  const { shift } = req.params

  if (!/^\d+$/.test(shift)) return res.status(400).json({ error: 'Invalid shift' })
  if (!getSftpConfig(site)) {
    return res.status(400).json({ error: `No SFTP credentials configured for site: ${site || '(missing)'}` })
  }

  try {
    const result = await withSftp(site, async (sftp) => {
      const remoteDir = '/receive'
      const list = await sftp.list(remoteDir)
      const target = list.find(
        (f) =>
          typeof f.name === 'string' &&
          f.name.toLowerCase().endsWith(ext) &&
          new RegExp(`\\b${shift}\\.${extNoDot}$`, 'i').test(f.name)
      )
      if (!target) return { status: 404 }

      const fileBuf = await sftp.get(`${remoteDir}/${target.name}`)
      const content = fileBuf.toString('utf8')
      return { status: 200, data: { shift, name: target.name, content, type: extNoDot } }
    })

    if (result.status === 404) return res.status(404).json({ error: 'Shift file not found' })
    res.json(result.data)
  } catch (err) {
    const msg = err?.message || String(err)
    const code = err?.code
    console.error('SFTP read error:', code, msg)
    if (code === 'ECONNREFUSED') return res.status(502).json({ error: 'SFTP connection refused' })
    if (code === 'ETIMEDOUT') return res.status(504).json({ error: 'SFTP connection timed out' })
    res.status(500).json({ error: 'Failed to read file' })
  }
})

module.exports = router
