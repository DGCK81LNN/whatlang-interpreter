#!/usr/bin/env node
/// <reference types="node" />
import { Command } from "commander"
import fs from "fs"
import readline from "readline"
import { type WhatContext, default_builtins, eval_what } from "./whatlang_interpreter"
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
    console.error(err)
    return 1
  }
}

async function runInteractiveSession() {
  const { stdin, stdout } = process
  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
    terminal: true,
  })
  rl.setPrompt("¿ ")
  rl.prompt()

  let output
  const ctx = createWhatContext(x => {
    if (x) output = true
    stdout.write(x)
  })

  let code = "",
    depth = 0,
    parenDepth = 0,
    quote = ""
  const clear = () => {
    code = ""
    depth = 0
    parenDepth = 0
    quote = ""
    rl.setPrompt("¿ ")
  }
  rl.on("SIGINT", () => {
    clear()
    console.log("⎈C")
    rl.write(null, { ctrl: true, name: "u" }) // clear line
  })

  for await (const line of rl) {
    if (!line.trim()) {
      rl.prompt()
      continue
    }

    code += line
    let i = 0
    let c: string
    while ((c = line[i++])) {
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

    output = false
    try {
      await eval_what(code, ctx)
    } catch (err) {
      console.error(err)
    }

    clear()
    if (output) console.log()
    rl.prompt()
  }
  console.log("⌁")
}
