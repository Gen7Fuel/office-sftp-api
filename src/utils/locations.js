// filepath: office-sftp-api/src/utils/locations.js
const LOCATIONS_URL = 'https://app.gen7fuel.com/api/locations'
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

const normalizeSiteKey = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '_')

let cache = { data: null, fetchedAt: 0 }

async function fetchLocations() {
  const res = await fetch(LOCATIONS_URL)
  if (!res.ok) {
    const err = new Error(`Locations API responded with ${res.status}`)
    err.code = 'LOCATIONS_FETCH_FAILED'
    throw err
  }
  return res.json()
}

async function getLocations() {
  const isFresh = cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS
  if (isFresh) return cache.data

  try {
    const data = await fetchLocations()
    cache = { data, fetchedAt: Date.now() }
    return data
  } catch (err) {
    if (cache.data) {
      console.error('Locations fetch failed, serving stale cache:', err?.message || err)
      return cache.data
    }
    err.code = err.code || 'LOCATIONS_FETCH_FAILED'
    throw err
  }
}

async function getIndNumber(site) {
  const key = normalizeSiteKey(site)
  const locations = await getLocations()
  const match = locations.find((loc) => normalizeSiteKey(loc.site) === key)
  if (!match || !match.INDNumber) {
    const err = new Error(`Unknown site: ${site || '(missing)'}`)
    err.code = 'SITE_NOT_FOUND'
    throw err
  }
  return match.INDNumber
}

module.exports = { getIndNumber }
