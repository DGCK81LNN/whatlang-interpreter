import { type Awaitable, Binary, difference } from "cosmokit"

/** WhatLang value. */
export type WhatValue = string | number | undefined | WhatValue[]
/**
 * Native function.
 *
 * For the convenience of defining void functions, returning `undefined` means not to return anything;
 * returning `null` means to return Undefined.
 */
export type WhatFunc = (this: WhatContext, ...args: WhatValue[]) => Awaitable<WhatValue | null>
export interface WhatContext {
    /** Frame Stack. Must not be empty. */
    fstack: WhatValue[][]
    /** Builtins dict. */
    builtins: Record<string, WhatFunc>
    /** Variables dict. */
    var_dict: Record<string, WhatValue>
    /** Called when outputting a value. */
    output: (x: string) => void
    /** Called in the main loop during execution. Return `true` or throw an `UncatchableException` to terminate execution. */
    dead_loop_check?: () => Awaitable<boolean | null | undefined>
    /** AbortSignal to terminate execution. Use an `UncatchableException` as reason when calling `abort()` on the corresponding AbortController. */
    signal?: AbortSignal
}
export const is_what_value = (x: unknown, _seen: unknown[] = []): x is WhatValue =>
    x === undefined || typeof x === "string" || typeof x === "number" ||
    (Array.isArray(x) && x.every(i => _seen.includes(x) || is_what_value(i, [..._seen, x])))

export const uncatchable_exception = Symbol.for("whatlang.uncatchable_exception")
export interface UncatchableException {
    [uncatchable_exception]: true
}
export const is_uncatchable_exception = (e: unknown): e is UncatchableException => {
    return e != null && typeof e === "object" && uncatchable_exception in e
}

export const to_string = (x: WhatValue) => typeof x === "string" ? x : formatting(x)
export function to_number(x: WhatValue): number {
    if (typeof x === "string" || typeof x === "number") return +x
    if (Array.isArray(x) && x.length === 1) return to_number(x[0])
    return NaN
}
export const to_bool = (x: WhatValue) => !!x || Number.isNaN(x)

/**
 * Convert value to integer. Note that the result might be ±Infinity.
 *
 * @param x Fallback result for NaN, defaults to 0.
 */
function to_int(x: WhatValue, nan = 0) {
    x = to_number(x)
    if (Number.isNaN(x)) return nan
    return Math.trunc(x)
}

const op: Record<string, (x: WhatValue, y: WhatValue) => WhatValue> = {
    '+': (x, y) =>
        Array.isArray(x) || Array.isArray(y) ? ([] as WhatValue[]).concat(x, y)
        : typeof x === "string" || typeof y === "string" ? to_string(x) + to_string(y)
        : to_number(x) + to_number(y),
    '-': (x, y) =>
        Array.isArray(x) ? difference(x, Array.isArray(y) ? y : [y])
        : Array.isArray(y) ? difference([x], y)
        : typeof x === "string" && typeof y === "string" ?
            difference(Array.from(to_string(x)), Array.from(to_string(y))).join("")
        :   to_number(x) - to_number(y),
    '*': (x, y) => {
        if (Array.isArray(x) || typeof x === "string") {
            const num = to_int(y)
            if (num <= 0) return typeof x === "string" ? "" : []
            if (typeof x === "string") return x.repeat(num)
            return Array.from({ length: num }, () => x).flat()
        }
        return to_number(x) * to_number(y)
    },
    '/': (x, y) => {
        if (Array.isArray(x) || typeof x === "string") {
            const num = to_int(y)
            if (num <= 0) return [x]
            const array = typeof x === "string" ? Array.from(x) : x
            const newArray = Array.from(
                { length: Math.ceil(array.length / num) },
                (_, i) => array.slice(i * num, (i + 1) * num),
            )
            if (typeof x === "string") return newArray.map(x => x.join(""))
            return newArray
        }
        return to_number(x) / to_number(y)
    },
    '%': (x, y) => to_number(x) % to_number(y),
    '?': function compare(x, y): number {
        if (Array.isArray(x) || Array.isArray(y)) {
            if (!Array.isArray(x)) x = [x]
            if (!Array.isArray(y)) y = [y]
            for (let i = 0; i < Math.min(x.length, y.length); i++) {
                const r = compare(x[i], y[i])
                if (r !== 0) return r
            }
            return compare(x.length, y.length)
        }
        if (x == y) return 0
        x ??= NaN
        y ??= NaN
        return x > y ? 1 : x < y ? -1 : NaN
    },
}

function relize(x: WhatValue) {
    if (Array.isArray(x)) return new RegExp(to_string(x[0] ?? ""), to_string(x[1] ?? ""))
    return new RegExp(to_string(x ?? ""))
}

function safeFromBase64(x: string) {
    x = x.replace(/[^A-Za-z0-9+/]+/g, "")
    if (x.length % 4 === 1) x = x.slice(0, -1)
    //x = x.padEnd(Math.ceil(x.length / 4) * 4, '=')
    return new Uint8Array(Binary.fromBase64(x))
}

function FE(segs: readonly string[], ...values: WhatValue[]) {
    return String.raw({ raw: segs }, ...values.map(x => formatting(x, { depth: 1, maxArrayLength: 4, maxStringLength: 50 })))
}

export const default_builtins: Record<string, WhatFunc> = Object.freeze({
    num: x => to_number(x),
    str: x => to_string(x),
    repr: x => repr_formatting(x),
    arr: x => {
        if (typeof x === "string" || Array.isArray(x)) return Array.from(x)
        throw TypeError(FE`Cannot convert ${x} to Array, expected Array or String`)
    },
    pow: (x, y) => to_number(x) ** to_number(y),
    sin: x => Math.sin(to_number(x)),
    cos: x => Math.cos(to_number(x)),
    tan: x => Math.tan(to_number(x)),
    asin: x => Math.asin(to_number(x)),
    acos: x => Math.acos(to_number(x)),
    atan: x => Math.atan(to_number(x)),
    band: (x, y) => to_number(x) & to_number(y),
    bor: (x, y) => to_number(x) | to_number(y),
    bxor: (x, y) => to_number(x) ^ to_number(y),
    bnot: x => ~x!,
    rand: () => Math.random(),
    randint: (x, y) => {
        x = to_number(x)
        y = to_number(y)
        return Math.floor(Math.random() * (y - x) + x)
    },
    flr: x => Math.floor(to_number(x)),
    range: x => {
        const fromTo = Array.isArray(x) ? x.slice(0, 2) : [0, x]
        const [from, to] = fromTo.map(x => to_int(x))
        const length = to - from
        if (!(length > 0)) return []
        return Array.from({ length }, (_, i) => from + i)
    },
    len: function () {
        const array = this.fstack.at(-1)!.at(-1)
        if (typeof array !== "string" && !Array.isArray(array)) {
            if (array == undefined)
                throw TypeError(FE`Cannot get length of ${array}, expected Array or String`)
            return null
        }
        return array.length
    },
    split: (x, y) => {
        x = to_string(x)
        if (Array.isArray(y)) return x.split(relize(y))
        if (y === undefined) return [x]
        return x.split(to_string(y))
    },
    join: function (x) {
        x = to_string(x)
        let array = this.fstack.at(-1)!.at(-1)
        if (typeof array === "string") {
            // TODO: emit deprecation warning
            array = [...array]
        }
        if (Array.isArray(array)) return array.map(to_string).join(x)
        throw TypeError(FE`Cannot join ${array}, expected Array`)
    },
    reverse: function () {
        const array = this.fstack.at(-1)!.at(-1)
        if (typeof array === "string") return [...array].reverse().join("")
        if (Array.isArray(array)) return [...array].reverse()
        throw TypeError(FE`Cannot reverse ${array}, expected Array or String`)
    },
    in: function (x) {
        const array = this.fstack.at(-1)!.at(-1)
        if (typeof array === "string") return array.indexOf(to_string(x))
        if (Array.isArray(array)) return array.indexOf(x)
        throw TypeError(FE`Cannot find index of item in ${array}, expected Array or String`)
    },
    filter: async function (x) {
        const array = this.fstack.at(-1)!.at(-1)
        if (typeof array !== "string" && !Array.isArray(array))
            throw TypeError(FE`Cannot filter ${array}, expected Array or String`)
        const results = []
        for (const i of array) {
            const result = await exec_what({
                ...this,
                fstack: [this.fstack.at(-1)!.concat([i, x])],
            })
            if (to_bool(result)) results.push(i)
        }
        return results
    },
    chr: x => String.fromCodePoint(...(Array.isArray(x) ? x : [x]).map(c => {
        const cNum = to_number(c)
        if (!Number.isInteger(cNum)) throw RangeError(FE`Invalid code point ${c} for character`)
        return cNum
    })),
    ord: x => Array.from(to_string(x), i => i.codePointAt(0)),
    and: (x, y) => to_bool(x) ? y : x,
    or: (x, y) => to_bool(x) ? x : y,
    nan: () => NaN,
    undef: () => null,
    inf: () => Infinity,
    ninf: () => -Infinity,
    eq: (x, y) => +(x === y),
    stak: function () { return this.fstack.at(-1) },
    stack: function () { return [...this.fstack.at(-1)!] },
    try: async function () {
        const stack = this.fstack.at(-1)!
        const fstack = [stack]
        try {
            await exec_what({ ...this, fstack })
        } catch (e) {
            // close open Arrays
            while (fstack.length > 1) {
                const array = fstack.pop()
                fstack.at(-1)!.push(array)
            }

            if (is_uncatchable_exception(e)) throw e
            if (e instanceof Error) return [e.name, e.message]
            if (is_what_value(e)) return [undefined, e]
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            return [undefined, String(e)]
        }
        return [undefined, undefined]
    },
    throw: x => {
        if (Array.isArray(x)) {
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            if (x[0] === undefined) throw x[1]
            throw Object.assign(new Error(to_string(x[1])), { name: to_string(x[0]) })
        }
        throw new Error(to_string(x))
    },
    match: (x, y) => [...to_string(x).match(relize(y)) ?? []],
    repl: (x, y, z) => {
        x = to_string(x)
        z = to_string(z)
        if (y == undefined) return x
        if (Array.isArray(y)) return x.replace(relize(y), z)
        return x.replace(to_string(y), z)
    },
    // RegExp.escape() impl
    reesc: x => Array.from(to_string(x), (char, i) => {
        if (char === "\t") return "\\t"
        if (char === "\n") return "\\n"
        if (char === "\v") return "\\v"
        if (char === "\f") return "\\f"
        if (char === "\r") return "\\r"
        if (/[$()*+./?[\\\]^{|}]/.test(char)) return "\\" + char
        if (
            (i === 0 && /[\da-z]/i.test(char)) ||
            /^[!"#%&',\-:;<=>@`~\s\ud800-\udfff]$/.test(char)
        ) {
            const cp = char.codePointAt(0)!
            if (cp <= 0xff) return "\\x" + cp.toString(16).padStart(2, "0")
            return "\\u" + cp.toString(16).padStart(4, "0")
        }
        return char
    }).join(""),
    time: () => Date.now(),
    sleep: async function (x) {
        const milliseconds = to_int(to_number(x) * 1000, NaN)
        if (!(milliseconds >= 0)) return // TODO: emit warning
        return new Promise((res, rej) => {
            const { signal } = this
            signal?.throwIfAborted()
            const timeout = setTimeout(() => {
                res(undefined)
                signal?.removeEventListener("abort", abort)
            }, milliseconds)
            const abort = () => {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                rej(signal!.reason)
                clearTimeout(timeout)
            }
            signal?.addEventListener("abort", abort)
        })
    },
    type: x => x == undefined ? "Undefined" : x.constructor.name,
    all: function () { return Object.keys(this.builtins) },
    b64: x => {
        if (!Array.isArray(x)) throw TypeError(FE`Cannot convert ${x} to Base64, expected Array`)
        return Binary.toBase64(Uint8Array.from(x, i => to_int(i)).buffer)
    },
    nb64: x => [...safeFromBase64(to_string(x))],
    utf8: x => [...new TextEncoder().encode(to_string(x))],
    nutf8: x => {
        if (!Array.isArray(x)) throw TypeError(FE`Cannot decode ${x} from UTF-8, expected Array`)
        return new TextDecoder().decode(Uint8Array.from(x, i => to_int(i)))
    },
})

const escapeCharMap: Record<string, string> = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' }
export function formatting(
    value: WhatValue,
    options: {
        depth?: number
        maxArrayLength?: number
        maxStringLength?: number
        _seen?: WhatValue[]
    } = {},
): string {
    if (value === Infinity) return "Inf"
    if (value === -Infinity) return "-Inf"
    if (value === undefined) return "undef"

    if (typeof value === "string") {
        const { maxStringLength = 4000 } = options
        let maxLen = maxStringLength
        if (maxLen < value.length && value.codePointAt(maxLen - 1)! > 0xffff) maxLen--
        const truncated = value.slice(0, maxLen)
        const lines =
            truncated.length > 50 ? truncated.match(/[^\n\r\f]*(?:\r?\n|\r|\f)?/g)!.filter(Boolean)
            :   [truncated]
        const escapedLines = lines.map(line => {
            line = line.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
            for (const [key, val] of Object.entries(escapeCharMap))
                line = line.replaceAll(val, "\\" + key)
            return line
        })
        let quoted = `"${escapedLines.join('"\n  "')}"`
        if (value.length > maxLen) {
            const restCount = value.length - maxLen
            quoted += `... ${restCount} more char${restCount > 1 ? "s" : ""}`
        }
        return quoted
    }

    if (Array.isArray(value)) {
        const { depth = 4, maxArrayLength = 100, _seen = [] } = options
        if (_seen.includes(value)) return "[...circular]"
        if (depth < 0) return "[...]"
        const contents = value.slice(0, maxArrayLength).map(item =>
            formatting(item, {
                ...options,
                depth: depth - 1,
                _seen: [..._seen, value],
            })
        )
        if (value.length > maxArrayLength) {
            const restCount = value.length - maxArrayLength
            contents.push(`... ${restCount} more item${restCount > 1 ? "s" : ""}`)
        }
        if (contents.some(c => c.includes("\n")))
            return `[\n  ${contents.map(c => c.replaceAll("\n", "\n  ")).join(",\n  ")}\n]`
        return `[${contents.join(", ")}]`
    }

    return String(value)
}

function is_valid_paren_string(x: string): boolean {
    let depth = 0
    for (const c of x) {
        if (c === '(') depth++
        else if (c === ')') depth--
        if (depth < 0) return false
    }
    return depth === 0
}

export function repr_formatting(x: WhatValue, _seen: WhatValue[] = []): string {
    if (Array.isArray(x)) {
        if (_seen.includes(x))
            throw TypeError(FE`Cannot represent value with circular reference ${x}`)
        return `[${x.map(i => i === x ? "stak@" : repr_formatting(i, [..._seen, x])).join(" ")}]`
    } else if (typeof x == "string") {
        if (/^[a-z][a-z0-9_]*$/.test(x)) return x
        else if (is_valid_paren_string(x)) return `(${x})`
        else return `"${x
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            // eslint-disable-next-line no-control-regex
            .replace(/\x08/g, "\\b")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t")
            .replace(/\r/g, "\\r")
            .replace(/\f/g, "\\f")}"`
    } else if (x === undefined) {
        return "undef@"
    } else if (Number.isNaN(x)) {
        return "nan@"
    } else if (x == Infinity) {
        return "inf@"
    } else if (x == -Infinity) {
        return "ninf@"
    } else if (Object.is(x, -0)) {
        return "(-0)num@"
    } else if (typeof x == "number") {
        if (x < 0 || x >= 1e21 || !Number.isInteger(x)) return `(${x})num@`
        return String(x)
    }
    throw TypeError(FE`Cannot represent alien value ${x}`)
}

export async function exec_what(ctx: WhatContext) {
    const stack = ctx.fstack.at(-1)!
    let func: WhatValue | WhatFunc = stack.pop()
    if (typeof func === "string" && /^[\dA-Z]\w*$|^[^!-~]+$/i.test(func)) {
        if (Object.hasOwn(ctx.var_dict, func)) func = ctx.var_dict[func]
        else if (Object.hasOwn(ctx.builtins, func)) func = ctx.builtins[func]
    }
    if (typeof func === "function") {
        const fill = Math.max(0, func.length - stack.length)
        const args = [...Array<undefined>(fill), ...(func.length ? stack.splice(-func.length) : [])]
        const result = await func.apply(ctx, args)
        if (result !== undefined) stack.push(result ?? undefined)
        return result ?? undefined
    } else {
        if (typeof func !== "string") throw TypeError(FE`Cannot evaluate ${func}, expected String`)
        const { result } = await eval_what(func, ctx)
        return result
    }
}

export interface RunWhatResult extends EvalWhatResult {
    /** @deprecated Use `result` */
    stack: WhatValue
    /** Output of WhatLang code. */
    output: string
}
/** Run WhatLang code and return the result and String output. */
export async function run_what(
    code: string,
    builtins: Record<string, WhatFunc> = default_builtins,
    var_dict: Record<string, WhatValue> = {},
): Promise<RunWhatResult> {
    let output = ""
    const result = await eval_what(code, {
        fstack: [[]],
        builtins,
        var_dict,
        output: x => { output += x },
    })
    return {
        ...result,
        stack: result.result,
        output,
    }
}

export interface EvalWhatResult {
    /** Result of WhatLang code. */
    result: WhatValue
    /** True if the program reached EOF without being halting prematurely by the `!` instruction. */
    eof: boolean
}
export async function eval_what(code: string, ctx: WhatContext): Promise<EvalWhatResult> {
    const dead_loop_check = ctx.dead_loop_check ?? (() => { /* noop */ })
    let stack = ctx.fstack.at(-1)!
    let i = -1, c: string
    while ((c = code[++i])) {
        if (await dead_loop_check())
            throw Object.assign(new Error("Execution timeout"), {
                [Symbol.for("whatlang.uncatchable_exception")]: true,
            })
        ctx.signal?.throwIfAborted()
        if (/\s/.test(c)) {
            continue
        } else if (/[1-9]/.test(c)) {
            let value = 0
            do {
                value = value * 10 + Number(c)
                c = code[++i]
            } while (c && /\d/.test(c))
            i--
            stack.push(value)
        } else if ('0' === c) {
            stack.push(0)
        } else if (/[a-zA-Z]/.test(c)) {
            let value = ""
            do {
                value += c
                c = code[++i]
            } while (c && /[a-zA-Z0-9_]/.test(c))
            i--
            stack.push(value.toLowerCase())
        } else if ("'" === c) {
            const cp = code.codePointAt(++i)!
            const start = i
            if (cp > 0xffff) i++
            stack.push(code.slice(start, i + 1))
        } else if (/["`]/.test(c)) {
            const quote = c
            let value = ""
            while ((c = code[++i])) {
                if ('\\' === c) {
                    c = code[++i]
                    value += escapeCharMap[c] ?? c
                } else if (quote === c) break
                else value += c
            }
            if ('"' === quote) {
                if (!c) throw SyntaxError("Unterminated String")
                stack.push(value)
            } else if ('`' === quote) {
                ctx.output(value)
            }
        } else if (c in op) {
            const b = stack.pop(), a = stack.pop()
            stack.push(op[c](a, b))
        } else if ('~' === c) {
            stack.push(+!to_bool(stack.pop()))
        } else if ('[' === c) {
            stack = []
            ctx.fstack.push(stack)
        } else if ('|' === c) {
            const array = stack.at(-1)
            if (!Array.isArray(array)) throw TypeError(FE`Cannot open ${array} as Stack`)
            stack.pop()
            stack = array
            ctx.fstack.push(stack)
        } else if (']' === c) {
            const array = ctx.fstack.pop()
            if (!ctx.fstack.length) ctx.fstack.push([])
            stack = ctx.fstack.at(-1)!
            stack.push(array)
        } else if ('(' === c) {
            let value = "", depth = 1
            while ((c = code[++i])) {
                if ('(' === c) ++depth
                else if (')' === c) --depth
                if (!depth) break
                value += c
            }
            if (!c) throw SyntaxError("Unterminated String")
            stack.push(value)
        } else if (')' === c) {
            throw SyntaxError("Unexpected token ')'")
        } else if ('.' === c) {
            ctx.output(to_string(stack.at(-1)))
        } else if ('\\' === c) {
            if (stack.length >= 2) {
                const b = stack.pop(), a = stack.pop()
                stack.push(b, a)
            }
        } else if ('&' === c) {
            if (stack.length >= 2) stack.unshift(stack.pop())
        } else if (':' === c) {
            if (stack.length >= 1) stack.push(stack.at(-1))
        } else if ('_' === c) {
            stack.pop()
        } else if ('=' === c) {
            const name = stack.pop()
            if (typeof name !== "string")
                throw TypeError(FE`Invalid variable name ${name} for assignment, expected String`)
            ctx.var_dict[name] = stack.at(-1)
        } else if ('^' === c) {
            const name = stack.pop()
            if (typeof name !== "string")
                throw TypeError(FE`Invalid variable name ${name} for retrieval, expected String`)
            stack.push(
                Object.hasOwn(ctx.var_dict, name) ? ctx.var_dict[name]
                : Object.hasOwn(ctx.builtins, name) ? `${name}@`
                :   undefined
            )
        } else if ('@' === c) {
            await exec_what(ctx)
            stack = ctx.fstack.at(-1)!
        } else if ('>' === c) {
            const count = to_number(stack.pop())
            stack.push(stack.splice(-count)) // gathers entire stack when count is 0
        } else if ('<' === c) {
            const array = stack.pop()
            if (!Array.isArray(array)) throw TypeError(FE`Cannot spread ${array}, expected Array`)
            stack.push(...array)
        } else if ('{' === c) {
            const cond = stack.pop()
            if (!to_bool(cond)) {
                let depth = 1
                while (c && depth && (c = code[++i])) {
                    if ("'" === c) i++
                    else if ('{' === c) ++depth
                    else if ('}' === c) --depth
                    else if ('(' === c) {
                        let depth2 = 1
                        while (depth2 && (c = code[++i])) {
                            if ('(' === c) ++depth2
                            else if (')' === c) --depth2
                        }
                    } else if ('"' === c || '`' === c) {
                        const quote = c
                        while ((c = code[++i])) {
                            if ('\\' === c) i++
                            else if (quote === c) break
                        }
                    }
                }
                if (!c) throw SyntaxError("Unterminated loop")
            }
        } else if ('}' === c) {
            const cond = stack.pop()
            if (to_bool(cond)) {
                let depth = -1
                while (depth && (c = code[--i])) {
                    if ("'" === code[i - 1]) i--
                    else if ('{' === c) ++depth
                    else if ('}' === c) --depth
                    else if (')' === c) {
                        let depth2 = -1
                        while (depth2 && (c = code[--i])) {
                            if ('(' === c) ++depth2
                            else if (')' === c) --depth2
                        }
                    } else if ('"' === c || '`' === c) {
                        const quote = c
                        while ((c = code[--i])) {
                            if ('\\' === code[i - 1]) i--
                            else if (quote === c) break
                        }
                    }
                }
                if (!c) throw SyntaxError("Unexpected token '}'")
            }
        } else if ('!' === c) {
            let depth = 1
            while ('!' === code[++i]) depth++
            i--
            while (depth && (c = code[++i])) {
                if ("'" === c) i++
                else if ('{' === c) ++depth
                else if ('}' === c) --depth
                else if ('(' === c) {
                    let depth2 = 1
                    while (depth2 && (c = code[++i])) {
                        if ('(' === c) ++depth2
                        else if (')' === c) --depth2
                    }
                } else if ('"' === c || '`' === c) {
                    const quote = c
                    while ((c = code[++i])) {
                        if ('\\' === c) i++
                        else if (quote === c) break
                    }
                }
            }
            if (!c) return { result: stack.at(-1), eof: false }
        } else if ('#' === c) {
            const func = stack.pop(), array = stack.at(-1)
            if (typeof array !== "string" && !Array.isArray(array))
                throw TypeError(FE`Cannot iterate ${array}, expected Array or String`)
            const arr = []
            for (const x of array) {
                ctx.signal?.throwIfAborted()
                const result = await exec_what({ ...ctx, fstack: [stack.concat([x, func])] })
                arr.push(result)
            }
            stack.push(arr)
        } else if (',' === c) {
            const index = stack.pop()
            const array = stack.at(-1)
            if (typeof array !== "string" && !Array.isArray(array))
                throw TypeError(
                    `Cannot get ${Array.isArray(index) && index.length >= 2 ? "slice" : "item"}` +
                        FE` in ${array}, expected Array or String`
                )

            if (Array.isArray(index) && index.length >= 2) {
                const [from, to] = index.slice(0, 2).map(x => {
                    if (x == undefined || Number.isNaN(x)) return Infinity
                    return to_int(x, NaN)
                })
                if (isNaN(from) || isNaN(to))
                    throw TypeError(FE`Invalid range ${index} for getting slice in ` + array.constructor.name)
                stack.push(array.slice(from, to))
            } else {
                const indexNum = to_int(index, NaN)
                if (isNaN(indexNum)) stack.push(undefined)
                else stack.push(array.at(indexNum))
            }
        } else if (';' === c) {
            const value = stack.pop()
            const index = stack.pop()
            const array = stack.at(-1)
            if (!Array.isArray(array))
                throw TypeError(
                    `Cannot ${Array.isArray(index) && index.length >= 2 ? "replace slice" : "set item"}` +
                        FE` in ${array}, expected Array`
                )

            if (Array.isArray(index) && index.length >= 2) {
                if (!Array.isArray(value))
                    throw TypeError(FE`Cannot set range in Array to ${value}, expected Array`)
                let [from, to] = index.slice(0, 2).map(x => {
                    if (x == undefined || Number.isNaN(x)) return Infinity
                    return to_int(x, NaN)
                })
                if (isNaN(from) || isNaN(to))
                    throw TypeError(FE`Invalid range ${index} for replacing slice in Array`)
                if (from < 0) from += array.length
                if (to < 0) to += array.length
                array.splice(from, to - from, ...value)
            } else if (index == undefined || Number.isNaN(index) || index == array.length) {
                array.push(value)
            } else {
                const indexNum = to_number(index)
                if (isNaN(indexNum))
                    throw TypeError(FE`Invalid index ${index} for setting item in Array`)
                let indexInt = to_int(indexNum)
                if (indexInt < 0) indexInt += array.length
                if (indexInt >= 0 && indexInt < array.length) array[indexInt] = value
            }
        } else if ('$' === c) {
            const index = stack.pop()
            const array = stack.at(-1)
            if (!Array.isArray(array))
                throw TypeError(
                    `Cannot delete ${Array.isArray(index) && index.length >= 2 ? "slice" : "item"}` +
                        FE` in ${array}, expected Array`
                )

            if (Array.isArray(index) && index.length >= 2) {
                let [from, to] = index.slice(0, 2).map(x => {
                    if (x == undefined || Number.isNaN(x)) return Infinity
                    return to_int(x, NaN)
                })
                if (isNaN(from) || isNaN(to))
                    throw TypeError(FE`Invalid range ${index} for deleting slice in Array`)
                if (from < 0) from += array.length
                if (to < 0) to += array.length
                array.splice(from, to - from)
            } else if (index != undefined && !Number.isNaN(index)) {
                const indexNum = to_number(index)
                if (isNaN(indexNum))
                    throw TypeError(FE`Invalid index ${index} for deleting item in Array`)
                const indexInt = to_int(indexNum)
                if (indexInt >= -array.length && indexInt < array.length) array.splice(indexInt, 1)
            }
        }
    }
    return { result: stack.at(-1), eof: true }
}
