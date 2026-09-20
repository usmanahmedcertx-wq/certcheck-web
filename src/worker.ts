/**
 * The web Worker does two things: serve the per-environment configuration,
 * and hand everything else to the static assets.
 *
 * Act 0 to 2: this file exists but /config.json is unused, because the SPA
 * reads VITE_API_BASE, which Vite compiles in. Three builds, three bundles.
 *
 * Act 3: the SPA fetches /config.json instead, and the three builds collapse
 * into one. That single change is what makes build-once and flippable flags
 * possible, which is why it comes before the feature-flag act.
 */
/** The assets binding, typed structurally: `@cloudflare/workers-types`
 *  cannot be pulled in here, because its globals collide with the DOM
 *  types the SPA in `main.ts` needs. */
export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  ENVIRONMENT: string
  API_BASE: string
  BUILD_SHA?: string
  BUNDLE_HASH?: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === "/config.json") {
      return Response.json(
        {
          env: env.ENVIRONMENT,
          apiBase: env.API_BASE,
          build: env.BUILD_SHA ?? "local",
          bundle: env.BUNDLE_HASH ?? "local",
        },
        { headers: { "cache-control": "no-store" } },
      )
    }
    return env.ASSETS.fetch(request)
  },
}
