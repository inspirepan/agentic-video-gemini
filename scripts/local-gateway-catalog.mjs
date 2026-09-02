#!/usr/bin/env node
// Point the LOCAL AI Gateway (wrangler dev, :9787) at Vertex v1beta1 so
// `mediaProcessing` is accepted, or restore the repo catalog.
//
//   node scripts/local-gateway-catalog.mjs            # apply v1beta1 override
//   node scripts/local-gateway-catalog.mjs --restore  # put shared/models.json back
//
// Only touches the local Miniflare KV key `models:v1`; production is untouched.
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const GATEWAY = process.env.GATEWAY_RUNTIME_URL ?? 'http://localhost:9787'
const CONTROL_TOKEN = process.env.PROXY_CONTROL_TOKEN ?? 'dev-proxy-control-token'
const CATALOG = process.env.GATEWAY_MODELS_JSON ?? join(homedir(), 'code/ai-gateway/shared/models.json')
const PROVIDER = 'google-vertex-genai1'

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
const restore = process.argv.includes('--restore')
if (!restore) {
  const provider = catalog.providerList?.[PROVIDER]
  if (!provider?.customHost) throw new Error(`provider ${PROVIDER} not found in ${CATALOG}`)
  provider.customHost = provider.customHost.replace('/v1/', '/v1beta1/')
  console.log(`${PROVIDER}.customHost → ${provider.customHost}`)
} else {
  console.log(`restoring catalog from ${CATALOG}`)
}

const response = await fetch(`${GATEWAY}/__dev/kv-put`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${CONTROL_TOKEN}` },
  body: JSON.stringify({ key: 'models:v1', value: catalog }),
})
console.log(response.status, await response.text())
