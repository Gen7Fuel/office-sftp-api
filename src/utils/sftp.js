// filepath: office-sftp-api/src/utils/sftp.js
const SftpClient = require('ssh2-sftp-client')
const { getSftpConfig } = require('../config/sftpConfig')

async function withSftp(site, fn, attempts = 2) {
  const cfg = getSftpConfig(site)
  if (!cfg) {
    const err = new Error(`Missing SFTP config for site: ${site || '(missing)'}`)
    err.code = 'CONFIG'
    throw err
  }

  const legacy =
    process.env.SFTP_LEGACY === '1'
      ? {
          algorithms: {
            kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1'],
            serverHostKey: ['ssh-rsa'],
            cipher: ['aes128-cbc', '3des-cbc', 'aes128-ctr', 'aes256-ctr'],
            hmac: ['hmac-sha1', 'hmac-sha2-256']
          }
        }
      : {}

  let lastErr
  for (let i = 0; i < attempts; i++) {
    const sftp = new SftpClient()
    try {
      await sftp.connect({ ...cfg, readyTimeout: 15000, ...legacy })
      const out = await fn(sftp)
      await sftp.end().catch(() => {})
      return out
    } catch (err) {
      lastErr = err
      await sftp.end().catch(() => {})
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)))
    }
  }
  throw lastErr
}

module.exports = { withSftp }
