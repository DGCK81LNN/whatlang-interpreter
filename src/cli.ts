#!/usr/bin/env node
/// <reference types="node" />
import { Command } from "commander"
import fs from "fs"
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
      // interactive mode not implemented yet
      return program.help()
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
