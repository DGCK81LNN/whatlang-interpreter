# whatlang-interpreter

[![npm](https://img.shields.io/npm/v/whatlang-interpreter.svg)](https://www.npmjs.com/package/whatlang-interpreter)

Fork of the original interpreter for [WhatLang](https://esolangs.org/wiki/WhatLang) (2024), as a standalone package

## Usage

~~~shell
what your_code.what
~~~

~~~typescript
import { eval_what, default_var_dict } from "whatlang-interpreter"
await eval_what(
  "114 514+.",
  [[]],
  { ...default_var_dict },
  console.log,
) // Prints and returns: 628
~~~
