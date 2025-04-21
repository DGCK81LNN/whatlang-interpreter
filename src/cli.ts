#!/usr/bin/env node
/** @format */
/// <reference types="node" />
import { Command } from "commander"
import fs from "fs"
import { eval_what, default_var_dict } from "./whatlang_interpreter"

const program = new Command()

program
  .name("wl")
  .description("WhatLang, a stack-based programming language")
  .version("0.1.0")
  .argument("[file]", "file to execute")
  .option("-e, --execute <code>", "execute code directly")
  .action((file: string, options: { execute?: string }) => {
    let code = ""
    if (options.execute) {
      code = options.execute
    } else if (file && file !== "-") {
      try {
        code = fs.readFileSync(file, "utf-8")
      } catch (err) {
        console.error(`Error reading file: ${err.message}`)
        process.exit(1)
      }
    } else if (process.stdin.isTTY && !file) {
      // interactive mode not implemented yet
      return program.help()
    } else {
      const stdinBuffer = fs.readFileSync(0, "utf-8")
      code = stdinBuffer
    }
    return executeCode(code)
  })

program.parse(process.argv)

async function executeCode(code: string) {
  try {
    await eval_what(code, [[]], { ...default_var_dict }, t =>
      process.stdout.write(String(t))
    )
  } catch (err) {
    console.error(err)
    process.exit(126)
  }
}
