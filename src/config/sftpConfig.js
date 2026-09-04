// filepath: office-sftp-api/src/config/sftpConfig.js
require('dotenv').config()
const fs = require('fs')
const os = require('os')
const path = require('path')
const { getIndNumber } = require('../utils/locations')

const SFTP_KEY_USERNAME = 'gen7report'
const SFTP_KEY_PATH = path.join(os.homedir(), '.ssh', 'id_ed25519_sentex')

let cachedPrivateKey

function loadPrivateKey() {
  if (!cachedPrivateKey) {
    cachedPrivateKey = fs.readFileSync(SFTP_KEY_PATH)
  }
  return cachedPrivateKey
}

async function getSftpConfig(site) {
  const host = process.env.SFTP_HOST
  const port = Number(process.env.SFTP_PORT || 22)
  if (!host || !port) {
    const err = new Error('Missing SFTP_HOST/SFTP_PORT configuration')
    err.code = 'CONFIG'
    throw err
  }

  const indNumber = await getIndNumber(site)
  const privateKey = loadPrivateKey()

  return { host, port, username: SFTP_KEY_USERNAME, privateKey, indNumber }
}

module.exports = { getSftpConfig }
