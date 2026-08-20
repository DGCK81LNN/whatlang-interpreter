import { type WhatFunc, type WhatValue, to_number, to_string } from "./whatlang_interpreter"
import { type CommonBuiltinsOptions, FE, get_common_builtins } from "./common"
import { Buffer } from "node:buffer"
import fsp from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import process from "node:process"
import readlinep from "node:readline/promises"
import { type Options as ExecaOptions, execa, execaCommand } from "execa"
import detectRuntime from "is-runtime"
import { Stats } from "node:fs"

const runtime = detectRuntime()

function OP(segs: readonly string[], ...values: (string | null | undefined)[]) {
  if (!values.every(Boolean)) return null
  return String.raw({ raw: segs }, ...values)
}

export interface NativeBuiltinsOptions extends CommonBuiltinsOptions {
  input?: (() => Promise<WhatValue>) | null
}

export function get_native_builtins(options: NativeBuiltinsOptions = {}): Record<string, WhatFunc> {
  const o = get_common_builtins(options)
  const { input } = options

  o.you = () =>
    [
      "WhatLang/2024",
      "Environment/native",
      `Backend/${runtime}`,
      OP`Platform/${os.platform?.()}`,
      OP`Machine/${os.machine?.()}`,
      OP`Arch/${os.arch?.()}`,
    ]
      .filter(Boolean)
      .join(" ")

  if (input) o.pr = () => input()
  else if (input === undefined) {
    let rl: readlinep.Interface
    o.pr = async function () {
      rl ??= readlinep.createInterface({ input: process.stdin })
      // TODO: readline clears the current terminal line; we need a way to use the current unfinished line as prompt
      return await rl.question("", { signal: this.signal })
    }
  }

  o.cwd = () => process.cwd()
  o.cd = x => {
    process.chdir(to_string(x))
  }

  o.envall = () => Object.keys(process.env)
  o.envget = name => {
    if (name === "" || name == undefined) return null
    return process.env[to_string(name)] ?? null
  }
  o.envset = (value, name) => {
    if (name === "" || name == undefined)
      throw TypeError(
        FE`Invalid name ${name} for setting environment variable, expected non-empty String`,
      )
    if (value == undefined) delete process.env[to_string(name)]
    else process.env[to_string(name)] = to_string(value)
  }
  o.envdel = name => {
    if (name === "" || name == undefined) return
    delete process.env[to_string(name)]
  }

  function silentEnoent(exc: NodeJS.ErrnoException) {
    if (exc.code === "ENOENT") return null
    throw exc
  }
  o.fileget = async file => {
    if (file === "" || file == undefined) return null
    return fsp.readFile(to_string(file), "utf-8").catch(silentEnoent)
  }
  o.filege = async file => {
    if (file === "" || file == undefined) return null
    return fsp.readFile(to_string(file)).then(buf => [...buf], silentEnoent)
  }
  o.fileput = async (data, file) => {
    if (file === "" || file == undefined)
      throw TypeError(FE`Invalid path ${file} for putting file, expected non-empty String`)
    await fsp.writeFile(to_string(file), to_string(data))
  }
  o.filepu = async (data, file) => {
    if (file === "" || file == undefined)
      throw TypeError(FE`Invalid path ${file} for putting file, expected non-empty String`)
    await fsp.writeFile(
      to_string(file),
      Buffer.from(
        Array.isArray(data) ? data.map(x => Math.trunc(to_number(x) || 0)) : to_string(data),
      ),
    )
  }
  o.filedel = async file => {
    if (file === "" || file == undefined) return
    await fsp.unlink(to_string(file)).catch(silentEnoent)
  }

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  o.dir = async dir => [...(await fsp.readdir(to_string(dir || ".")))]

  o.pathsep = () => path.sep

  const statToArray = (e: Stats) => [
    e.isFile() ? "file"
    : e.isDirectory() ? "directory"
    : e.isSymbolicLink() ? "symlink"
    : e.isBlockDevice() ? "blockdevice"
    : e.isCharacterDevice() ? "characterdevice"
    : e.isFIFO() ? "fifo"
    : e.isSocket() ? "socket"
    : "unknown",
    e.size,
    e.birthtimeMs,
    e.ctimeMs,
    e.mtimeMs,
    e.atimeMs,
  ]
  o.stat = async file => fsp.stat(to_string(file)).then(statToArray, silentEnoent)

  function execaWhat(cmd: WhatValue, options: ExecaOptions<"buffer">) {
    if (Array.isArray(cmd)) {
      if (!cmd.length) return
      const [name, ...args] = cmd.slice(0, 2).map(to_string)
      return execa(name, args, options)
    }
    return execaCommand(to_string(cmd), options)
  }
  o.system = async function (cmd) {
    const result = await execaWhat(cmd, {
      stdio: "inherit" as const,
      reject: false,
      signal: this.signal,
    })
    if (!result) return 0
    return result?.exitCode
  }
  o.pexec = async function (cmd, input) {
    const result = await execaWhat(cmd, {
      stderr: "inherit" as const,
      input:
        Array.isArray(input) ?
          Buffer.from(input.map(x => Math.trunc(to_number(x) || 0)))
        : to_string(input),
      encoding: "buffer" as const,
      reject: false,
      signal: this.signal,
    })
    if (!result) return [0, []]
    return [result.exitCode, [...result.stdout]]
  }

  return o
}
