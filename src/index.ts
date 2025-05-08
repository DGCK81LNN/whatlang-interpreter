import { Dict, WhatFrame, WhatValue } from "./types"
import { FormattingOptions } from "./utils"

export interface InterpreterOptions {
  formatting?: FormattingOptions
}

export class Interpreter {
  varDict = Object.create(null) as Dict<WhatValue>

  constructor(public options: InterpreterOptions = {}) {}

  eval(
    code: string,
    stack: WhatValue[],
    frameName = "",
    callStack: WhatFrame[] = []
  ) {
    //
  }
}
