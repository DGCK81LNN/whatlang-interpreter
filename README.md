# whatlang-interpreter

[![npm](https://img.shields.io/npm/v/whatlang-interpreter.svg?style=flat-square)](https://www.npmjs.com/package/whatlang-interpreter) ![what?](https://img.shields.io/badge/what%3F-cyan?style=flat-square&labelColor=%23f00&logo=data:image/svg%2Bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0ODAgNDgwIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJNMTc4LDE4MmMtOC43LDAtMTMuMS0zLjYtMTUuMy0xMi40TDE1MCw5OC44bC0xMi43LDcwLjhjLTIuMiw4LjgtNi42LDEyLjQtMTUuMywxMi40SDkwYy04LjcsMC0xMy4xLTMuNi0xNS4zLTEyLjRsLTI3LTEyMGMtMS45LTcuNC0xLjgtMTMsMC40LTE1LjdDNTAsMzEuNCw1NSwzMCw2MiwzMGgxM2M4LjcsMCwxMy4xLDMuNiwxNS4zLDEyLjRsMTkuNyw5MC44bDE5LjctOTAuOGMyLjItOC44LDYuNi0xMi40LDE1LjMtMTIuNGgxMGM4LjcsMCwxMy4xLDMuNiwxNS4zLDEyLjRsMTkuNyw5MC44bDE5LjctOTAuOGMyLjItOC44LDYuNi0xMi40LDE1LjMtMTIuNGgxM2M3LDAsMTIsMS40LDEzLjksMy45YzIuMSwyLjcsMi4yLDguMiwwLjQsMTUuN2wtMjcsMTIwYy0yLjIsOC44LTYuNiwxMi40LTE1LjMsMTIuNEgxNzh6Ii8+PHBhdGggZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMyIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJNMjU0LjYsNDQxLjhjLTQwLjQsMC03OS0xMS40LTEwMC4xLTMwLjRjLTIyLjktMjAuNi0zNi44LTM5LjktMzYuOC04Mi43YzAtNDcuMSwzMi4zLTc1LjEsNjIuMS05MC4yYzI0LjUtMTIuNCw2OC4xLTI2LDkwLjItMzIuN2MxNi00LjksMjIuOS0xNy4zLDIyLjktMzNsMCwwYzAtMTEuOSw5LjktMjEuNiwyMi4xLTIxLjZoNDEuN2MxMi4yLDAsMjIuMSw5LjcsMjIuMSwyMS42bDAuMywyNC43YzAsMzguNS0yNy40LDU3LjgtNTAuMyw2NGMtNTYuNCwxNS4yLTEwNS45LDI4LjktMTA1LjksNjZjMCwyNy44LDI2LjUsNDIuNSw1MC41LDQyLjVjMjcuMiwwLDU2LjMtMTMuMyw3My4yLTIzLjdjOC40LTUuMiwyMC44LTkuNSwyOS44LTkuNWM4LjgsMCwxNywyLjQsMjQuMiw5LjZjNi45LDYuOSw5LjUsMTUuMSw5LjUsMjQuNmMwLDEwLjYtNi44LDIyLjktMTIuNiwyOUMzNjUuNSw0MzIsMzExLjgsNDQxLjgsMjU0LjYsNDQxLjh6IE0zMzUuOCw0Mi4xYy0yNy4yLDAtNDkuMywxNS40LTQ5LjMsMzQuNHMyMi4xLDM0LjQsNDkuMywzNC40YzI3LjIsMCw0OS4zLTE1LjQsNDkuMy0zNC40UzM2My4xLDQyLjEsMzM1LjgsNDIuMXoiLz48L3N2Zz4=&logoColor=white)

Fork of the core part of the [original](https://github.com/YufangProbably/koishi-plugins/tree/main/plugins/whatlang) interpreter for [WhatLang](https://esolangs.org/wiki/WhatLang) (2024), as a standalone library and command-line tool.

Fork of the Koishi runtime (remaining part of the original interpreter) can be found [here](https://github.com/DGCK81LNN/yufang-koishi-plugins/tree/main/plugins/whatlang).

## Usage

The package provides the `what` command-line interpreter:

```shell
what your_code.what
what -e '114 514+.'
```

Run `what` without a file in a terminal to start the interactive interpreter. Each input line is evaluated in the same context, so variables and the Stack persist throughout the session. Press Ctrl+C to interrupt the current evaluation or clear pending input; input EOF (Ctrl+D) or press Ctrl+C twice at an empty prompt to exit.

## JavaScript API

Use `run_what` when you want to simply execute code and capture its output:

```typescript
import { run_what } from "whatlang-interpreter"

const result = await run_what("114 514+.")
console.log(result.result) // 628
console.log(result.output) // "628"
```

Use `eval_what` with a `WhatContext` for more fine-grained control:

```typescript
import { default_builtins, eval_what, type WhatContext } from "whatlang-interpreter"

const context: WhatContext = {
  fstack: [[]],
  builtins: default_builtins,
  var_dict: {},
  output: console.log,
}

await eval_what("42answer=_", context)
const { result } = await eval_what("answer^.", context)
```

`default_builtins` only contains the core builtins of the language. `get_common_builtins()` provides the ability to perform simple HTTP requests where `fetch()` is available, and `get_native_builtins()` will add more abilities including file I/O and subprocess execution.
