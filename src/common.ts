import {
  type WhatValue,
  type WhatFunc,
  default_builtins,
  formatting,
  to_number,
  to_string,
} from "./whatlang_interpreter"

export interface CommonBuiltinsOptions {
  fetch?: typeof fetch | null
}

export function FE(segs: readonly string[], ...values: WhatValue[]) {
  return String.raw(
    { raw: segs },
    ...values.map(x => formatting(x, { depth: 1, maxArrayLength: 4, maxStringLength: 50 })),
  )
}

function toHeadersInit(value: WhatValue): HeadersInit {
  if (value == undefined || value === "") return []
  if (!Array.isArray(value))
    throw new TypeError(FE`Invalid HTTP headers ${value}, expected Array or Undefined`)
  const headers: [string, string][] = []
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length < 2) continue
    const [k, v] = pair
    headers.push([to_string(k), to_string(v)])
  }
  return headers
}

function toBodyInit(input: WhatValue): BodyInit | undefined {
  if (input == undefined) return input
  if (Array.isArray(input)) return Uint8Array.from(input, x => Math.trunc(to_number(x) || 0))
  return to_string(input)
}

export function get_common_builtins(options: CommonBuiltinsOptions = {}): Record<string, WhatFunc> {
  const o = { ...default_builtins }
  const { fetch = global.fetch } = options

  if (typeof fetch === "function") {
    o.cat = async function (url) {
      const resp = await fetch(to_string(url), { signal: this.signal })
      return await resp.text()
    }
    o.ca = async function (url) {
      const resp = await fetch(to_string(url), { signal: this.signal })
      return [...new Uint8Array(await resp.arrayBuffer())]
    }
    o.fetch = async function (method, url, headers, body) {
      const resp = await fetch(to_string(url), {
        method: to_string(method),
        headers: toHeadersInit(headers),
        body: toBodyInit(body),
        signal: this.signal,
      })
      return await resp.text()
    }
    o.fech = async function (method, url, headers, body) {
      const resp = await fetch(to_string(url), {
        method: to_string(method),
        headers: toHeadersInit(headers),
        body: toBodyInit(body),
        signal: this.signal,
      })
      return [...new Uint8Array(await resp.arrayBuffer())]
    }
  }

  return o
}
