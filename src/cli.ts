#!/usr/bin/env node
/// <reference types="node" />
import { Command } from "commander"
import fs from "fs"
import readline from "readline"
import {
  type WhatContext,
  default_builtins,
  eval_what,
  formatting,
  is_what_value,
  uncatchable_exception,
} from "./whatlang_interpreter"
import { version } from "../package.json"

const program = new Command()

program
  .name("what")
  .description("WhatLang, a stack-based programming language")
  .version(`whatlang-interpreter ${version}`, "-v, --version")
  .argument("[file]", "file to execute")
  .option("-e, --execute <code>", "execute code directly")
  .action(async (file: string, options: { execute?: string }) => {
    let code
    if (options.execute) {
      code = options.execute
    } else if (file && file !== "-") {
      try {
        code = fs.readFileSync(file, "utf-8")
      } catch (err) {
        console.error(`Error reading file: ${err instanceof Error ? err.message : String(err)}`)
        process.exitCode = 1
        return
      }
    } else if (process.stdin.isTTY && !file) {
      return await runInteractiveSession()
    } else {
      code = fs.readFileSync(0, "utf-8")
    }
    const result = await executeCode(code)
    if (typeof result === "number" && Number.isInteger(result)) process.exitCode = result
  })

program.parse(process.argv)

function createWhatContext(
  output: (x: string) => void = x => process.stdout.write(x),
): WhatContext {
  return {
    fstack: [[]],
    builtins: default_builtins,
    var_dict: {},
    output,
  }
}

async function executeCode(code: string) {
  try {
    return await eval_what(code, createWhatContext())
  } catch (err) {
    console.error("UNCAUGHT", is_what_value(err) ? formatting(err) : err)
    return 1
  }
}

class Interrupt extends Error {
  [uncatchable_exception] = true
}
const EXIT_ON_CTRL_C_TIMES = 2

async function runInteractiveSession() {
  const { stdin, stdout } = process
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: true,
  })
  rl.setPrompt("¿ ")
  rl.prompt()

  let running = false
  /** True means something has been output after we last added a newline after it. */
  let output

  const ctx = createWhatContext(x => {
    if (!x) return
    output = true
    stdout.write(x)
  })

  let abort: AbortController

  /** Keyboard interrupt flag. */
  let lastSleep = -Infinity
  ctx.dead_loop_check = async () => {
    // allow readline to process input so we can abort on Ctrl-C
    const now = Date.now()
    if (now - lastSleep > 100) {
      lastSleep = now
      await new Promise(res => setTimeout(res, 0))
    }
  }

  /** Pending chunk of incomplete code. */
  let code = ""
  let depth = 0
  let parenDepth = 0
  let quote = ""
  const clear = () => {
    ctrlCCount = 0
    code = ""
    depth = 0
    parenDepth = 0
    quote = ""
    rl.setPrompt("¿ ")
  }

  /** Counter for exiting REPL when user presses Ctrl-C with empty input 2 times in a row. */
  let ctrlCCount = 0
  rl.on("SIGINT", () => {
    console.log("⎈C")
    if (running) {
      abort.abort(new Interrupt())
      output = false
    } else if (rl.line || code) {
      clear()
      rl.write(null, { ctrl: true, shift: true, name: "backspace" })
      rl.write(null, { ctrl: true, shift: true, name: "delete" })
    } else {
      if (++ctrlCCount >= EXIT_ON_CTRL_C_TIMES) rl.close()
      else rl.prompt()
    }
  })

  for await (const line of rl) {
    ctrlCCount = 0
    if (!line.trim()) {
      rl.prompt()
      continue
    }

    code += line
    for (let i = 0; i < code.length; i++) {
      const c = code[i]
      if (quote) {
        if (c === "\\") i++
        else if (c === quote) quote = ""
        continue
      } else if (c === '"' || c === "`") {
        quote = c
        continue
      }
      if (c === "(") ++parenDepth
      else if (parenDepth && c === ")") --parenDepth
      else if (parenDepth) continue
      if (c === "{") ++depth
      else if (c === "}") {
        if (!depth) break
        --depth
      } else if (c === "'") i++
    }
    if (depth || parenDepth || quote) {
      code += "\n"
      rl.setPrompt(
        parenDepth ? "( "
        : quote ? `${quote} `
        : "{ ",
      )
      rl.prompt()
      continue
    }

    running = true
    output = false
    abort = new AbortController()
    ctx.signal = abort.signal
    try {
      await eval_what(code, ctx)
    } catch (err) {
      if (!(err instanceof Interrupt))
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        console.error("\rUNCAUGHT", is_what_value(err) ? formatting(err) : String(err))
    }
    running = false

    clear()
    if (output) console.log()
    rl.prompt()
  }
  if (ctrlCCount >= EXIT_ON_CTRL_C_TIMES) return
  console.log("⌁")
}
