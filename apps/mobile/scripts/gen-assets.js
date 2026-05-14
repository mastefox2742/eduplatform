/**
 * Generates minimal valid PNG assets for Expo prebuild.
 * No dependencies — uses only Node built-ins (zlib, fs).
 */
const zlib = require('zlib')
const fs   = require('fs')
const path = require('path')

// ── CRC32 ────────────────────────────────────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[i] = c
  }
  return t
})()

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

// ── PNG writer ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.allocUnsafe(4)
  lenBuf.writeUInt32BE(data.length)
  const crcBuf = Buffer.allocUnsafe(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([lenBuf, t, data, crcBuf])
}

function createPNG(width, height, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdr = Buffer.allocUnsafe(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type: RGB
  ihdr[10] = ihdr[11] = ihdr[12] = 0

  // Raw scanlines: 1 filter byte + 3 bytes/pixel per row
  const raw = Buffer.allocUnsafe(height * (1 + width * 3))
  for (let y = 0; y < height; y++) {
    const off = y * (1 + width * 3)
    raw[off] = 0 // filter: None
    for (let x = 0; x < width; x++) {
      raw[off + 1 + x * 3]     = r
      raw[off + 1 + x * 3 + 1] = g
      raw[off + 1 + x * 3 + 2] = b
    }
  }

  const idat = zlib.deflateSync(raw, { level: 6 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ── Generate assets ──────────────────────────────────────────────────────────
const assetsDir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(assetsDir, { recursive: true })

// Brand color: #1e40af (blue-800)
const BLUE = [30, 64, 175]
// White for favicon
const WHITE = [255, 255, 255]

const assets = [
  { file: 'icon.png',          w: 1024, h: 1024, color: BLUE  },
  { file: 'adaptive-icon.png', w: 1024, h: 1024, color: BLUE  },
  { file: 'splash.png',        w: 1284, h: 2778, color: BLUE  },
  { file: 'favicon.png',       w: 48,   h: 48,   color: WHITE },
]

for (const { file, w, h, color } of assets) {
  const [r, g, b] = color
  const buf = createPNG(w, h, r, g, b)
  const dest = path.join(assetsDir, file)
  fs.writeFileSync(dest, buf)
  console.log(`✓ ${file} (${w}×${h}, ${buf.length} bytes)`)
}

console.log('\nAssets generated in apps/mobile/assets/')
