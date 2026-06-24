const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const router = express.Router();

const TILE_CACHE_ROOT = process.env.OSM_TILE_CACHE_DIR
  ? path.resolve(process.env.OSM_TILE_CACHE_DIR)
  : path.join(__dirname, '..', 'cache', 'osm-tiles');
const TILE_CACHE_TTL_SECONDS = Number(process.env.OSM_TILE_CACHE_TTL_SECONDS || 7 * 24 * 60 * 60);
const TILE_USER_AGENT = process.env.OSM_TILE_USER_AGENT || 'LiveTogether/1.0 (+local-development)';
const TILE_REFERER = process.env.OSM_TILE_REFERER || 'https://localhost';
const UPSTREAM_TEMPLATE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const isPositiveInteger = (value) => /^\d+$/.test(value);

const buildCacheFilePath = (z, x, y) => path.join(TILE_CACHE_ROOT, z, x, `${y}.png`);

const getFreshnessMs = () => TILE_CACHE_TTL_SECONDS * 1000;

const sendTileResponse = (res, buffer, cacheState) => {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', `public, max-age=${TILE_CACHE_TTL_SECONDS}, stale-while-revalidate=${TILE_CACHE_TTL_SECONDS}`);
  res.setHeader('X-OSM-Cache', cacheState);
  res.status(200).send(buffer);
};

const fetchUpstreamTile = async (upstreamUrl) => {
  const response = await fetch(upstreamUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      Referer: TILE_REFERER,
      'User-Agent': TILE_USER_AGENT,
      'X-Requested-With': 'com.anonymous.LiveTogether',
    },
  });

  if (!response.ok) {
    throw new Error(`OSM upstream responded with ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('image/')) {
    throw new Error(`Unexpected OSM content-type: ${contentType}`);
  }

  return Buffer.from(await response.arrayBuffer());
};

router.get('/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;

  if (![z, x, y].every(isPositiveInteger)) {
    return res.status(400).json({ error: 'Invalid tile coordinates' });
  }

  const cacheFilePath = buildCacheFilePath(z, x, y);

  try {
    const cachedStats = await fs.stat(cacheFilePath);
    const isFresh = Date.now() - cachedStats.mtimeMs < getFreshnessMs();

    if (isFresh) {
      const cachedBuffer = await fs.readFile(cacheFilePath);
      return sendTileResponse(res, cachedBuffer, 'hit');
    }
  } catch {
    // cache miss or unreadable cache file, fetch upstream below
  }

  const upstreamUrl = UPSTREAM_TEMPLATE
    .replace('{z}', z)
    .replace('{x}', x)
    .replace('{y}', y);

  try {
    const tileBuffer = await fetchUpstreamTile(upstreamUrl);
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
    await fs.writeFile(cacheFilePath, tileBuffer);
    return sendTileResponse(res, tileBuffer, 'miss');
  } catch (error) {
    try {
      const staleBuffer = await fs.readFile(cacheFilePath);
      console.warn(`OSM tile upstream failed for ${z}/${x}/${y}, serving stale cache:`, error.message);
      return sendTileResponse(res, staleBuffer, 'stale');
    } catch {
      console.error(`OSM tile request failed for ${z}/${x}/${y}:`, error.message);
      return res.status(502).json({ error: 'Unable to load map tile' });
    }
  }
});

module.exports = router;