# whatlang-interpreter

[![npm](https://img.shields.io/npm/v/whatlang-interpreter.svg)](https://www.npmjs.com/package/whatlang-interpreter)

Fork of the core part of the [original](https://github.com/YufangProbably/koishi-plugins/tree/main/plugins/whatlang) interpreter for [WhatLang](https://esolangs.org/wiki/WhatLang) (2024), as a standalone library and command-line tool

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

`default_builtins` only contains the core builtins of the language. `get_common_builtins()` provides the ability to perform simple HTTP requests where `fetch()` is available, and `get_native_builtins()` will add more abilities including file I/O and subprocess execution (coming soon).
