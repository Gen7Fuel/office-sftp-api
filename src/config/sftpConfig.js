// filepath: office-sftp-api/src/config/sftpConfig.js
require('dotenv').config()

const normalizeSiteKey = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '_')

function getSftpConfig(site) {
  const key = normalizeSiteKey(site)
  const host = process.env.SFTP_HOST
  const port = Number(process.env.SFTP_PORT || 22)
  const username = process.env[`SFTP_${key}_USER`] || process.env[`SFTP_${key}_USERNAME`]
  const password = process.env[`SFTP_${key}_PASS`] || process.env[`SFTP_${key}_PASSWORD`]
  if (!host || !port || !username || !password) return null
  return { host, port, username, password }
}

module.exports = { getSftpConfig }
