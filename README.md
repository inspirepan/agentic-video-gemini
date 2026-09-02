# Agentic Video · Gemini

A login-less demo that asks the same question about a public YouTube video twice, side by side:

- **Static** — the whole video is sampled at 1 fps (plus audio) into context in one pass (`media_processing: STATIC`).
- **Agentic** — Gemini navigates the timeline with its native video tools and loads only the frames and transcript it needs (`media_processing: AGENTIC`).

Both columns stream from **Gemini 3.7 Flash on Vertex AI** through the AI Gateway. The UI renders the thought summaries, the server-side media-processing tool steps, the answer (timestamps jump the player), and the token / time / cost breakdown that comes back in `usageMetadata`.

Announcement: <https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-agentic-video-in-gemini/>

## Layout

```
src/            React 19 + Vite + Tailwind 4 SPA (design tokens and ui/ primitives ported from image-playground)
worker/         Cloudflare Worker: /api/ask (SSE relay), /api/video (oEmbed), /api/health; serves dist/ as static assets
shared/         Request / response types + YouTube URL parsing shared by both
```

## How a question flows

1. The browser posts `{ videoUrl, prompt, mode, thinkingLevel, history }` to `/api/ask`, once per mode.
2. The Worker builds a Gemini `generateContent` body: the video part carries `fileData.fileUri` (YouTube URL) and `mediaProcessing`; `thinkingConfig.includeThoughts` is on.
3. The Worker calls `${GATEWAY_RUNTIME_URL}/gemini/v1beta/models/${MODEL_ID}:streamGenerateContent` with `x-goog-api-key: $GATEWAY_API_KEY` and relays the SSE bytes unchanged.
4. The browser parses the chunks: `thought: true` text → italic thinking block; bare `thoughtSignature` parts (Vertex's rendering of `tool_call` / `tool_response`) → "Media processing call" rows; text → markdown; the final chunk's `usageMetadata` → metrics.

Follow-up questions echo the previous turns. Vertex rejects bare signature parts on the way back (`Invalid thought signature`), so history keeps only content-bearing parts and the model re-navigates the video for each turn.

## Gateway requirement: Vertex `v1beta1`

`mediaProcessing` exists only on the Vertex **v1beta1** surface. The Gateway's `google-vertex-genai1` provider currently points at `.../v1/projects/lovart-genai1/locations/global/publishers/google`, and Vertex `v1` answers `Unknown name "mediaProcessing"`.

Change in `~/code/ai-gateway/shared/models.json` (then `pnpm sync-models` / KV `models:v1` sync), either globally:

```json
"google-vertex-genai1": {
  "customHost": "https://aiplatform.googleapis.com/v1beta1/projects/lovart-genai1/locations/global/publishers/google"
}
```

or as a dedicated provider alias + model entry so existing traffic is untouched:

```json
"providerList": {
  "google-vertex-genai1-v1beta1": {
    "apiType": "google-genai", "upstream": "google-vertex",
    "envKey": "GOOGLE_VERTEX_GENAI1_CREDENTIALS_JSON",
    "customHost": "https://aiplatform.googleapis.com/v1beta1/projects/lovart-genai1/locations/global/publishers/google"
  }
},
"modelList": {
  "gemini-3.7-flash": { "routes": { "google-genai": { "strategy": "fallback", "targets": [{ "provider": "google-vertex-genai1-v1beta1" }] } } }
}
```

`@google/genai` itself defaults to `v1beta1` for Vertex, so the global switch matches SDK behaviour.

## Credential

The Worker holds one Gateway key (`sk-…`) as the secret `GATEWAY_API_KEY`; every request is attributed to it in the Gateway's usage logs. Get one either by creating a key in the Gateway dashboard (`POST /api/keys`), or by redeeming an app-scoped code once via `/api/internal/apps/<appId>/redeem-session` and storing the returned `gatewayApiKey`.

## Develop

```bash
pnpm install
cp worker/.dev.vars.example worker/.dev.vars   # set GATEWAY_RUNTIME_URL + GATEWAY_API_KEY
pnpm build                                     # wrangler dev serves ../dist
pnpm dev                                       # Worker :8789 + Vite :5184 (proxies /api)
```

Local Gateway (`~/code/ai-gateway`, `pnpm dev`): seed a key with `POST http://localhost:9787/__dev/seed-key` (`Authorization: Bearer dev-proxy-control-token`), top up with `/__dev/topup`, and point the local catalog at v1beta1 with `/__dev/kv-put` on `models:v1`.

## Deploy

```bash
pnpm --filter agentic-video-gemini-worker exec wrangler secret put GATEWAY_API_KEY
pnpm deploy        # builds dist/ and deploys the Worker with the custom domain agentic-video-gemini.youtu.uk
```

`worker/wrangler.toml` declares the route `agentic-video-gemini.youtu.uk` as a Custom Domain (zone `youtu.uk`), a per-IP rate limit (20 req / 60 s), and the public vars `GATEWAY_RUNTIME_URL` / `MODEL_ID`.

## Known behaviour

- Vertex sometimes ends an agentic stream early with a trailing `429 RESOURCE_EXHAUSTED` JSON object; the UI shows it with a per-column Retry.
- Static mode on videos longer than roughly an hour overflows the 1M-token window and fails with 400; agentic still works.
- Thought summaries only appear reliably at thinking level medium or higher; low often returns only the tool steps and the answer.
- Cost is an estimate at Gemini 3.7 Flash list price ($0.75 / 1M input incl. tool-loaded tokens, $3.75 / 1M output incl. thinking).
