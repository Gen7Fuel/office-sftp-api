// filepath: office-sftp-api/src/routes/sftpRoutes.js
const express = require('express')
const { withSftp } = require('../utils/sftp')

const router = express.Router()

function mapSftpError(res, err, action) {
  const msg = err?.message || String(err)
  const code = err?.code
  console.error(`SFTP ${action} error:`, code, msg)
  if (code === 'SITE_NOT_FOUND') return res.status(400).json({ error: msg })
  if (code === 'LOCATIONS_FETCH_FAILED') return res.status(502).json({ error: 'Could not resolve site location' })
  if (code === 'CONFIG') return res.status(400).json({ error: msg })
  if (code === 'ECONNREFUSED') return res.status(502).json({ error: 'SFTP connection refused' })
  if (code === 'ETIMEDOUT') return res.status(504).json({ error: 'SFTP connection timed out' })
  res.status(500).json({ error: `Failed to ${action}` })
}

// GET /api/sftp/receive?site=SITE&type=sft|br
router.get('/receive', async (req, res) => {
  const { site } = req.query
  const type = (req.query.type || 'sft').toString().toLowerCase()
  const extNoDot = type === 'br' ? 'br' : 'sft'
  const ext = `.${extNoDot}`

  try {
    const files = await withSftp(site, async (sftp, { indNumber }) => {
      const remoteDir = `/${indNumber}`
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
    mapSftpError(res, err, 'list files')
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

  try {
    const result = await withSftp(site, async (sftp, { indNumber }) => {
      const remoteDir = `/${indNumber}`
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
    mapSftpError(res, err, 'read file')
  }
})

// GET /api/sftp/check/:shift?site=SITE
router.get('/check/:shift', async (req, res) => {
  const { site } = req.query
  const { shift } = req.params
  const extNoDot = 'sft'
  const ext = '.sft'

  if (!/^\d+$/.test(shift)) return res.status(400).json({ error: 'Invalid shift' })

  try {
    const valid = await withSftp(site, async (sftp, { indNumber }) => {
      const remoteDir = `/${indNumber}`
      const list = await sftp.list(remoteDir)
      const target = list.find(
        (f) =>
          typeof f.name === 'string' &&
          f.name.toLowerCase().endsWith(ext) &&
          new RegExp(`\\b${shift}\\.${extNoDot}$`, 'i').test(f.name)
      )
      return Boolean(target)
    })
    res.json({ valid })
  } catch (err) {
    mapSftpError(res, err, 'check file')
  }
})

module.exports = router
