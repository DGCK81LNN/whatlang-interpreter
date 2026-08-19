import { type WhatFunc } from "./whatlang_interpreter"
import { type CommonBuiltinsOptions, get_common_builtins } from "./common"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NativeBuiltinsOptions extends CommonBuiltinsOptions {}

export function get_native_builtins(options: NativeBuiltinsOptions = {}): Record<string, WhatFunc> {
  const o = get_common_builtins(options)
  //const {} = options

  return o
}
