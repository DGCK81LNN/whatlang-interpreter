import {
  WhatError,
  WhatType,
  WhatTypeMap,
  WhatValue,
  WhatValueOfType,
} from "./types"

export function typeOf<T extends WhatType>(value: WhatValueOfType<T>): T
export function typeOf(value: WhatValue): WhatType
export function typeOf(value: unknown) {
  if (typeof value === "string") return "String"
  if (typeof value === "number") return "Number"
  if (Array.isArray(value)) return "Array"
  if (value === undefined) return "Undefined"
  return "Unknown"
}

type WhatTypeWithChecker = Exclude<keyof WhatTypeMap, WhatType>
const typeCheckers = {
  Any(value) {
    // no-op
  },
} as {
  [K in WhatTypeWithChecker]: (value: WhatValue) => [string, string] | undefined
}

function checkType(
  value: WhatValue,
  expectType: keyof WhatTypeMap
): [expectDesc: string, actualDesc: string] | undefined {
  if (expectType in typeCheckers)
    return typeCheckers[expectType as WhatTypeWithChecker](value)
  const actualType = typeOf(value)
  if (expectType !== actualType)
    return [`of type ${expectType}`, formatting(value)]
}

export function popArgs<T extends (keyof WhatTypeMap)[]>(
  funcName: string,
  stack: WhatValue[],
  ...argTypes: T
): { [K in keyof T]: WhatTypeMap[T[K]] } {
  if (stack.length < argTypes.length)
    throw new WhatError(
      `${funcName} takes ${argTypes.length} arguments, only ${stack.length} values present in stack`
    )
  const values = stack.slice(-argTypes.length) // not mutating stack before checking types
  for (let i = 0; i < argTypes.length; i++) {
    const report = checkType(values[i], argTypes[i])
    if (report)
      throw new WhatError(
        `${funcName} expected argument ${i} to be ${report[0]}, got ${report[1]}`
      )
  }
  stack.length -= argTypes.length // types confirmed, remove the arguments from the stack
  return values as { [K in keyof T]: WhatTypeMap[T[K]] }
}

export function toBoolean(value: WhatValue): boolean {
  if (Number.isNaN(value)) return true
  return !!value
}

export function formatting(value: WhatValue): string {
  if (value === Infinity) return "Inf"
  if (value === -Infinity) return "-Inf"
  if (value === undefined) return "undef"
  if (typeof value === "string") {

  }
  if (Array.isArray(value)) {

  }
  return String(value)
}

export function toString(value: WhatValue): string {
  if (typeof value === "string") return value
  return formatting(value)
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
