import { WhatType, WhatTypeMap, WhatValue, WhatValueOfType } from "./types"

export function typeOf<T extends WhatType>(value: WhatValueOfType<T>): T
export function typeOf(value: WhatValue): WhatType
export function typeOf(value: unknown) {
  if (typeof value === "string") return "String"
  if (typeof value === "number") return "Number"
  if (Array.isArray(value)) return "Array"
  if (value === undefined) return "Undefined"
  return "Unknown"
}

export function popArgs<T extends (keyof WhatTypeMap)[]>(
  funcName: string,
  stack: WhatValue[],
  ...argTypes: T
): { [K in keyof T]: WhatTypeMap[T[K]] } {
  if (stack.length < argTypes.length)
    throw new Error(
      `${funcName} takes ${argTypes.length} arguments, only ${stack.length} values present in stack`
    )
  const values = stack.slice(-argTypes.length) // not mutating stack before checking types
  for (let i = 0; i < argTypes.length; i++) {
    const expectType = argTypes[i]
    const actualType = typeOf(values[i])
    if (expectType === "Any") continue
    if (expectType !== actualType)
      throw new Error(
        `${funcName} expected argument ${i} to be of type ${expectType}, got ${actualType}`
      )
  }
  stack.length -= argTypes.length // types confirmed, remove the arguments from the stack
  return values as { [K in keyof T]: WhatTypeMap[T[K]] }
}

export function toBoolean(value: WhatValue): boolean {
  if (Number.isNaN(value)) return true
  return !!value
}

export function toString(value: WhatValue): string {
  // TODO: invoke formatting if not already a string
  return String(value)
}

export function add(a: WhatValue, b: WhatValue) {
  if (
    (typeof a === "number" || a === undefined) &&
    (typeof b === "number" || b === undefined)
  )
    return +a! + +b!
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b]
  if (Array.isArray(a)) return [...a, b]
  if (Array.isArray(b)) return [a, ...b]
  return toString(a) + toString(b)
}

export function compare(a: WhatValue, b: WhatValue): number {
  if (a === b) return 0
  if (
    (typeof a === "number" || a === undefined) &&
    (typeof b === "number" || b === undefined)
  )
    return Math.sign(Number(a) - Number(b))
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      // TODO: handle circular references (possibly just catch the stack overflow error somewhere else)
      const cmp = compare(a[i], b[i])
      if (cmp !== 0) return cmp
    }
    return Math.sign(a.length - b.length)
  }
  const aStr = toString(a)
  const bStr = toString(b)
  return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
}

function safeLastIndexOf(str: string, searchStr: string, index?: number) {
  if (index && index < 0) return -1
  return str.lastIndexOf(searchStr, index)
}

export function getLineCol(
  code: string,
  index: number,
  startLine = 1,
  startCol = 1
) {
  const lineBreakBefore = safeLastIndexOf(code, "\n", index - 1)
  let col = index - lineBreakBefore
  let line = startLine
  for (let i = lineBreakBefore; i >= 0; i = safeLastIndexOf(code, "\n", i - 1))
    line++
  if (line === startLine) col += startCol - 1
  return { line, col }
}
