/**
 * CertCheck — a deliberately small single-page app.
 *
 * The only line in this file that matters to the course is where API_BASE
 * comes from. Act 0 to 2 compile it in; Act 3 reads it at run time, and the
 * three build commands collapse into one.
 */
import "./style.css"

// ---- Act 0 to 2: compiled in by Vite. Act 3 replaces these three lines. ----
const API_BASE = import.meta.env.VITE_API_BASE as string
const CONFIG: AppConfig = { env: import.meta.env.MODE, apiBase: API_BASE, build: "local", bundle: "local" }
const flags: Record<string, boolean> = {}

// ---- Act 3 onwards: uncomment this and delete the three lines above. -------
// const CONFIG: AppConfig = await (await fetch("/config.json")).json()
// const API_BASE = CONFIG.apiBase
// const flags: Record<string, boolean> = (await api<{ flags: Record<string, boolean> }>("/config")).flags

interface AppConfig { env: string; apiBase: string; build: string; bundle: string }
interface Audit { id: number; title: string; org_id: number }
interface Requirement {
  id: number; audit_id: number; clause: string; text: string; status: string; note: string | null
}

const STATUSES = ["unknown", "compliant", "non_compliant", "not_applicable"] as const
const LABEL: Record<string, string> = {
  unknown: "Unknown",
  compliant: "Compliant",
  non_compliant: "Non-compliant",
  not_applicable: "Not applicable",
}

// The organisation is a query parameter so that the per-organisation flag
// exercises in Act 5 are runnable. Real auth is out of scope for the lab.
const ORG = Number(new URLSearchParams(location.search).get("org") ?? 1)

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes("?") ? "&" : "?"
  const res = await fetch(`${API_BASE}${path}${sep}org=${ORG}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

const el = (html: string) => {
  const t = document.createElement("template")
  t.innerHTML = html.trim()
  return t.content.firstElementChild as HTMLElement
}

async function render() {
  const app = document.querySelector<HTMLDivElement>("#app")!
  app.innerHTML = ""

  app.append(
    el(`<header>
          <h1>CertCheck</h1>
          <p class="meta">
            <span class="pill">${CONFIG.env}</span>
            <span>org ${ORG}</span>
            <span class="mono">build ${CONFIG.build}</span>
            <span class="mono">bundle ${CONFIG.bundle}</span>
          </p>
        </header>`),
  )

  const audits = await api<Audit[]>("/audits")
  if (!audits.length) {
    app.append(el(`<p class="empty">No audits for organisation ${ORG}.</p>`))
    return
  }

  for (const audit of audits) {
    const section = el(`<section class="audit"><h2>${audit.title}</h2></section>`)
    const reqs = await api<Requirement[]>(`/audits/${audit.id}/requirements`)
    const table = el(`<table>
      <thead><tr><th>Clause</th><th>Requirement</th><th>Status</th></tr></thead>
      <tbody></tbody></table>`)
    const tbody = table.querySelector("tbody")!

    for (const r of reqs) {
      const row = el(`<tr>
        <td class="mono">${r.clause}</td>
        <td>${r.text}</td>
        <td></td>
      </tr>`)
      const select = el(
        `<select data-id="${r.id}">${STATUSES.map(
          (s) => `<option value="${s}"${s === r.status ? " selected" : ""}>${LABEL[s]}</option>`,
        ).join("")}</select>`,
      ) as HTMLSelectElement
      select.addEventListener("change", async () => {
        select.disabled = true
        try {
          await api(`/requirements/${r.id}`, {
            method: "PATCH",
            body: JSON.stringify({ status: select.value }),
          })
        } catch (err) {
          alert(`Could not save: ${(err as Error).message}`)
        } finally {
          select.disabled = false
        }
      })
      row.lastElementChild!.append(select)
      tbody.append(row)
    }
    section.append(table)
    app.append(section)
  }
}

render().catch((err) => {
  document.querySelector("#app")!.innerHTML =
    `<p class="error">Could not load CertCheck.<br><span class="mono">${(err as Error).message}</span></p>`
})

export { flags }
