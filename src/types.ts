export type Dict<T, K extends string | number | symbol = string> = Record<K, T>

export type WhatValue = string | number | WhatValue[] | undefined
export interface WhatTypeMap {
  String: string
  Number: number
  Array: WhatValue[]
  Undefined: undefined
  Unknown: never
  Any: WhatValue
}
export type WhatValueOfType<T extends keyof WhatTypeMap> = WhatTypeMap[T]
export type WhatType = Exclude<keyof WhatTypeMap, "Any">

export type WhatFunction = (stack: WhatValue[], fstack: WhatValue[][]) => void

export interface WhatTraceFrame {
  name: string
  line: number
  col: number
  source: string
}

export class WhatError extends Error {
  whatTrace: WhatTraceFrame[] = []
}

export interface WhatFrame {
  name: string
  fstack: WhatValue[][]
}
