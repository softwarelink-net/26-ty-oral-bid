#!/usr/bin/env node
/**
 * Upload dist/ to:
 *   1) R2 26-ty-oral-bid-assets  (project bucket)
 *   2) R2 allworld-sites/26-ty-oral-bid/  (shared Allworld host)
 */
import { execFile } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const root = join(fileURLToPath(import.meta.url), '..', '..')
const dist = join(root, 'dist')
const siteId = process.argv[2] || '26-ty-oral-bid'
const projectBucket = '26-ty-oral-bid-assets'
const sitesBucket = 'allworld-sites'
const concurrency = 6

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.sqlite': 'application/x-sqlite3',
  '.db': 'application/x-sqlite3',
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.assetsignore' || name === '.DS_Store' || name === '_routes.json') continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

async function put(bucket, key, file, ct) {
  console.log(`PUT ${bucket}/${key}`)
  await execFileAsync(
    'npx',
    ['wrangler', 'r2', 'object', 'put', `${bucket}/${key}`, `--file=${file}`, `--content-type=${ct}`, '--remote'],
    { cwd: root, maxBuffer: 20 * 1024 * 1024 },
  )
}

async function runPool(tasks, limit) {
  let i = 0
  const workers = Array.from({ length: limit }, async () => {
    while (i < tasks.length) {
      const cur = tasks[i++]
      await cur()
    }
  })
  await Promise.all(workers)
}

if (!existsSync(dist)) {
  console.error('dist/ missing. Run npm run build first.')
  process.exit(1)
}

const files = walk(dist)
if (!files.length) {
  console.error('dist/ is empty. Run npm run build first.')
  process.exit(1)
}

const tasks = []
for (const file of files) {
  const rel = relative(dist, file).replace(/\\/g, '/')
  const ct = mime[extname(file).toLowerCase()] || 'application/octet-stream'
  tasks.push(() => put(projectBucket, rel, file, ct))
  tasks.push(() => put(sitesBucket, `${siteId}/${rel}`, file, ct))
}

await runPool(tasks, concurrency)

console.log(`\nUploaded ${files.length} files × 2 buckets`)
console.log(`→ Host: https://${siteId}.softwarelink.net/`)
console.log(`→ R2:   ${projectBucket} + ${sitesBucket}/${siteId}/`)
