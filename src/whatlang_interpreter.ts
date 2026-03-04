import { Binary, makeArray } from "cosmokit"

const op : Record<string, (x : any, y : any) => any> = {
    "+": (x, y) => (
        Array.isArray(x) || Array.isArray(y) ? [].concat(x, y)
        : typeof x === "string" && typeof y !== "string" ? x + formatting(y)
        : typeof x !== "string" && typeof y === "string" ? formatting(x) + y
        : x + y
    ),
    "-": (x, y) => (x - y),
    "*": (x, y) => (x * y),
    "/": (x, y) => (x / y),
    "%": (x, y) => (x % y),
    "?": function compare(x, y) {
        if (Array.isArray(x) || Array.isArray(y)) {
            x = makeArray(x)
            y = makeArray(y)
            for (let i = 0; i < Math.min(x.length, y.length); i++) {
                const r = compare(x[i], y[i])
                if (r !== 0) return r
            }
            return compare(x.length, y.length)
        }
        return x == y ? 0 : x > y ? 1 : x < y ? -1 : NaN
    },
}

const relize = (x : string) => Array.isArray(x) ? new RegExp(x[0], x[1]) : x

const safeFromBase64 = (x: string) => {
    x = x.replace(/[^A-Za-z0-9+/]+/g, "")
    return new Uint8Array(Binary.fromBase64(x.padEnd(Math.ceil(x.length / 4) * 4, "=")))
}

function error<T>(f: () => T, g: () => Error) {
    try {
        return f()
    } catch {
        throw g()
    }
}
function FE(segs: readonly string[], ...values: any[]) {
    return String.raw({ raw: segs }, ...values.map(x => formatting(x, { maxArrayLength: 4, maxStringLength: 50 })))
}

export var default_var_dict : Record<string, any> = ({
    num: (x : any) => Number(x),
    str: (x : any) => typeof x === "string" ? x : formatting(x),
    repr: (x : any) => repr_formatting(x),
    arr: (x : any) => [...x],
    pow: (x : any, y : any) => x ** y,
    sin: (x : any) => Math.sin(x),
    cos: (x : any) => Math.cos(x),
    tan: (x : any) => Math.tan(x),
    asin: (x : any) => Math.asin(x),
    acos: (x : any) => Math.acos(x),
    atan: (x : any) => Math.atan(x),
    band: (x : any, y : any) => x & y,
    bor: (x : any, y : any) => x | y,
    bxor: (x : any, y : any) => x ^ y,
    bnot: (x : any) => ~x,
    rand: () => Math.random(),
    randint: (x : any, y : any) => Math.floor((Math.random() * (x - y)) + y),
    flr: (x : any) => Math.floor(x),
    range: (x : any) => [...Array(x).keys()],
    len: (s : any[][]) => error(
        () => s.at(-1).at(-1).length ?? null,
        () => TypeError(FE`Cannot get length of ${s.at(-1).at(-1)}, expected Array or String`)
    ),
    split: (x : any, y : any) => (typeof x == "string" ? x : formatting(x)).split(relize(y)),
    join: (x : any, s : any[][]) => error(
        () => Array.from(s.at(-1).at(-1), i => typeof i == "string" ? i : formatting(i)).join(x),
        () => TypeError(FE`Cannot join ${s.at(-1).at(-1)}, expected Array or String`)
    ),
    reverse: (s : any[][]) => error(
        () => [...s.at(-1).at(-1)].reverse(),
        () => TypeError(FE`Cannot reverse ${s.at(-1).at(-1)}, expected Array or String`)
    ),
    in: (x : any, s : any[][]) => error(
        () => s.at(-1).at(-1).indexOf(x),
        () => TypeError(FE`Cannot find index of item in ${s.at(-1).at(-1)}, expected Array or String`)
    ),
    filter: async (
        x : any,
        s : any[][],
        v : Record<string, any>,
        o : (x : any) => void,
    ) => {
        const arr = [];
        for (const i of error(() => s.at(-1).at(-1), () => TypeError(FE`Cannot fliter ${s.at(-1).at(-1)}, expected Array or String`))) {
            const result = await exec_what([s.at(-1).concat([i, x])], v, o);
            if (result || Number.isNaN(result)) arr.push(i);
        }
        return arr
    },
    chr: (x : any) => Array.isArray(x) ? String.fromCodePoint(...x) : String.fromCodePoint(x),
    ord: (x : any) => Array.from(typeof x == "string" ? x : formatting(x), i => i.codePointAt(0)),
    and: (x : any, y : any) => x || Number.isNaN(x) ? y : x,
    or: (x : any, y : any) => x || Number.isNaN(x) ? x : y,
    nan: () => NaN,
    undef: () => null,
    inf: () => Infinity,
    ninf: () => -Infinity,
    eq: (x : any, y : any) => +(x === y),
    stak: (s : any[][]) => s.at(-1),
    stack: (s : any[][]) => [...s.at(-1)],
    try: async (
        s : any[][],
        v : Record<string, any>,
        o : (x : any) => void,
    ) => {
        let temp : string[] = [undefined, undefined]
        let stack = s.at(-1)
        let temp2 = [stack]
        try {
            await exec_what(temp2, v, o)
        } catch (e) {
            if (e?.[Symbol.for("whatlang.uncatchable_exception")]) throw e
            temp = [e.name, e.message]
            if (temp2.includes(stack)) {
                while (temp2.at(-1) !== stack) {
                    temp2.at(-2).push(temp2.pop())
                }
            }
        }
        return temp
    },
    throw: (x : any) => {throw new Error(x)},
    match: (x : any, y : any) => [...x.match(relize(y)) || []],
    repl: (x : any, y : any, z : any) => x.replace(relize(y), z),
    time: () => Date.now(),
    type: (x : any) => x == undefined ? "Undefined" : x.constructor.name,
    b64: (x: any) => {
        if (!Array.isArray(x)) throw TypeError(FE`Cannot convert ${x} to Base64, expected Array`)
        return Binary.toBase64(new Uint8Array(x).buffer)
    },
    nb64: (x: any) => [...safeFromBase64(typeof x == "string" ? x : formatting(x))],
    utf8: (x: any) => [...new TextEncoder().encode(typeof x == "string" ? x : formatting(x))],
    nutf8: (x: any) => {
        if (!Array.isArray(x)) throw TypeError(FE`Cannot decode ${x} as UTF-8, expected Array`)
        return new TextDecoder().decode(new Uint8Array(x))
    },
})
export var need_svo : string[] = "filter try".split(" ")
export var need_fstack : string[] = "len join reverse in stak stack".split(" ")

const escapeCharMap = { b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" }
export function formatting(
    value: any,
    options: {
        depth?: number,
        maxArrayLength?: number,
        maxStringLength?: number,
        _seen?: any[],
    } = {},
): string {
    if (value === Infinity) return "Inf"
    if (value === -Infinity) return "-Inf"
    if (value === undefined) return "undef"

    if (typeof value === "string") {
        const { maxStringLength = 4000 } = options
        let maxLen = maxStringLength
        if (maxLen < value.length && value.codePointAt(maxLen - 1) > 0xffff) maxLen--
        const truncated = value.slice(0, maxLen)
        const lines =
            truncated.length > 50
                ? truncated.match(/[^\n\r\f]*(?:\r?\n|\r|\f)?/g).filter(Boolean)
                : [truncated]
        const escapedLines = lines.map(line => {
            line = line.replaceAll("\\", "\\\\").replaceAll('"', '\\"')
            for (const [key, val] of Object.entries(escapeCharMap))
                line = line.replaceAll(val, "\\" + key)
            return line
        })
        let quoted = '"' + escapedLines.join('"\n  "') + '"'
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
            return (
                "[\n  " +
                contents.map(c => c.replaceAll("\n", "\n  ")).join(",\n  ") +
                "\n]"
            )
        return "[" + contents.join(", ") + "]"
    }

    return String(value)
}

const is_valid_paren_string = (x : string) : boolean => {
    let depth = 0
    for (const c of x) {
        if (c === "(") depth++
        else if (c === ")") depth--
        if (depth < 0) return false
    }
    return depth === 0
}

const repr_formatting : (x : any) => string = (x : any) => {
    if (Array.isArray(x)) {
        return "[" + x.map(
            i => Array.isArray(i) && i == x ? "stack@" : repr_formatting(i)
        ).join(" ") + "]"
    } else if (typeof x == "string") {
        if (/^[a-z][a-z0-9_]*$/.test(x)) return x
        else if (is_valid_paren_string(x)) return "(" + x + ")"
        else return '"' + (x
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replace(/\r/g, '\\r')
            .replace(/\f/g, '\\f')
            .replace(/\v/g, '\\v')
        ) + '"'
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
        if (
            x < 0 || x >= 1.0e+21 ||
            !Number.isInteger(x)
        ) return "(" + String(x) + ")num@"
        return String(x)
    }
    return "${" + String(x) + "}"
}

export const exec_what = async (
    fstack : any[][],
    var_dict : Record<string, any>,
    output : (x : any) => void,
) => {
    var stack : any[] = fstack.at(-1)
    let temp : any, temp2 : any, temp3 : any
    //I should stop temping
    temp = stack.pop()
    if (temp in var_dict && typeof var_dict[temp] === "function") {
        temp3 = (
            need_svo.includes(temp) ? 3 :
            need_fstack.includes(temp) ? 1 :
            0
        )
        temp = var_dict[temp]
        temp2 = [fstack, var_dict, output]
        temp2.splice(temp3)
        temp2 = (temp.length > temp3 ? stack.splice(temp3 - temp.length) : []).concat(temp2)
        temp = await temp(...new Array(temp.length - temp2.length), ...temp2)
        if (temp === null) stack.push(undefined)
        else if (temp != undefined) stack.push(temp)
    } else {
        temp2 = temp in var_dict ? var_dict[temp] : temp
        if (typeof temp2 !== "string") throw TypeError(FE`Cannot evaluate ${temp2}, expected String`)
        await eval_what(temp2, fstack, var_dict, output)
    }
    return stack.at(-1)
}
export const run_what = async (
    code : string,
    var_dict : Record<string, any> = default_var_dict,
) => {
    let output : string = ""
    let stack : any = await eval_what(
        code, [[]],
        Object.assign({}, var_dict),
        (x : any) => {output += x},
    )
    return ({
        stack: stack,
        output: output,
    })
}

export const eval_what = async (
    code : string, fstack : any[][],
    var_dict : Record<string, any> = {},
    output : (x : any) => void = (x : any) => console.log(x),
) => {
    let dead_loop_check = (var_dict as any)[Symbol.for("whatlang.dead_loop_check")] ?? (() => {})
    var stack : any[] = fstack.at(-1)
    let i : number = -1, c : string
    let temp : any, temp2 : any
    while (c = code[++i]) {
        if (dead_loop_check())
            throw Object.assign(
                new Error("Execution timeout"),
                { [Symbol.for("whatlang.uncatchable_exception")]: true },
            )
        if (/\s/.test(c)) {
            continue
        } else if (/[1-9]/.test(c)) {
            temp = 0
            do {
                temp = temp * 10 + Number(c)
            } while (/\d/.test(c = code[++i]))
            i--
            stack.push(temp)
        } else if ('0' === c) {
            stack.push(0)
        } else if (/[a-zA-Z]/.test(c)) {
            temp = ""
            do {
                temp += c
            } while (/[a-zA-Z0-9_]/.test(c = code[++i]))
            i--
            stack.push(temp.toLowerCase())
        } else if ("'" === c) {
            if (code.codePointAt(++i) > 0xffff) stack.push(code.slice(i, ++i + 1))
            else stack.push(code[i])
        } else if (/["`]/.test(c)) {
            temp = ""
            temp2 = c
            while (c = code[++i]) {
                if ("\\" === c) {
                    c = code[++i]
                    temp += escapeCharMap[c] ?? c
                } else if (temp2 === c) break
                else temp += c
            }
            if ('"' === temp2) {
                if (!c) throw SyntaxError(FE`Unterminated String`)
                stack.push(temp)
            } else if ('`' === temp2) {
                output(temp)
            }
        } else if (c in op) {
            temp = stack.pop()
            stack.push(op[c](stack.pop(), temp))
        } else if ('~' === c) {
            temp = stack.pop()
            stack.push(+!(temp || Number.isNaN(temp)))
        } else if ('[' === c) {
            stack = []
            fstack.push(stack)
        } else if ('|' === c) {
            if (!Array.isArray(stack.at(-1))) throw TypeError(FE`Cannot open ${stack.at(-1)} as Stack`)
            temp = stack.pop()
            fstack.push(temp)
            stack = temp
        } else if (']' === c) {
            if (fstack.length <= 2) fstack.unshift([])
            stack = fstack.at(-2)
            stack.push(fstack.pop())
        } else if ('(' === c) {
            temp = ""
            temp2 = 1
            while (c = code[++i]) {
                if ('(' === c) ++temp2
                else if (')' === c) --temp2
                if (!temp2) break
                temp += c
            }
            if (!c) throw SyntaxError(FE`Unterminated String`)
            stack.push(temp)
        } else if ('.' === c) {
            temp = stack.at(-1)
            output(typeof temp == "string" ? temp : formatting(temp))
        } else if ('\\' === c) {
            if (stack.length >= 2) {
                temp = stack.pop()
                temp2 = stack.pop()
                stack.push(temp, temp2)
            }
        } else if ('&' === c) {
            if (stack.length >= 2)
                stack.unshift(stack.pop())
        } else if (':' === c) {
            if (stack.length >= 1) {
                temp = stack.pop()
                stack.push(temp, temp)
            }
        } else if ('_' === c) {
            stack.pop()
        } else if ('=' === c) {
            temp = stack.pop()
            var_dict[temp] = stack.at(-1)
        } else if ('^' === c) {
            temp = stack.pop()
            temp2 = var_dict[temp]
            stack.push(typeof temp2 == "function" ? temp + "@" : temp2)
        } else if ('@' === c) {
            await exec_what(fstack, var_dict, output)
            stack = fstack.at(-1)
        } else if ('>' === c) {
            stack.push(stack.splice(-stack.pop()))
        } else if ('<' === c) {
            temp = stack.pop()
            if (!Array.isArray(temp)) throw TypeError(FE`Cannot spread ${temp}, expected Array`)
            stack.push(...temp)
        } else if ('{' === c) {
            temp = stack.pop()
            if (!(Number.isNaN(temp) || temp)) {
                temp = 1
                while (c && temp && (c = code[++i])) {
                    if ("'" === c) i++
                    else if ('{' === c) ++temp
                    else if ('}' === c) --temp
                    else if ('(' === c) {
                        temp2 = 1
                        while (temp2 && (c = code[++i])) {
                            if ('(' === c) ++temp2
                            else if (')' === c) --temp2
                        }
                    } else if ('"' === c || '`' === c) {
                        temp2 = c
                        while (c = code[++i]) {
                            if ('\\' === c) i++
                            else if (temp2 === c) break
                        }
                    }
                }
                if (!c) throw SyntaxError(FE`Unterminated loop`)
            }
        } else if ('}' === c) {
            temp = stack.pop()
            if (Number.isNaN(temp) || temp) {
                temp = -1
                while (temp && (c = code[--i])) {
                    if ("'" === code[i - 1]) i--
                    else if ('{' === c) ++temp
                    else if ('}' === c) --temp
                    else if (')' === c) {
                        temp2 = -1
                        while (temp2 && (c = code[--i])) {
                            c = code[--i]
                            if ('(' === c) ++temp2
                            else if (')' === c) --temp2
                        }
                    } else if ('"' === c || '`' === c) {
                        temp2 = c
                        while (c = code[--i]) {
                            if ('\\' === code[i - 1]) i--
                            else if (temp2 === c) break
                        }
                    }
                }
                if (!c) throw SyntaxError(FE`Unexpected token '}'`)
            }
        } else if ('!' === c) {
            temp = 1
            while ('!' === code[++i]) temp++
            i--
            while (temp && (c = code[++i])) {
                if ("'" === c) i++
                else if ('{' === c) ++temp
                else if ('}' === c) --temp
                else if ('(' === c) {
                    temp2 = 1
                    while (temp2 && (c = code[++i])) {
                        if ('(' === c) ++temp2
                        else if (')' === c) --temp2
                    }
                } else if ('"' === c || '`' === c) {
                    temp2 = c
                    while (c = code[++i]) {
                        if ('\\' === c) i++
                        else if (temp2 === c) break
                    }
                }
            }
        } else if ("#" === c) {
            temp = stack.pop()
            const arr = []
            for (const x of error(() => stack.at(-1), () => TypeError(FE`Cannot iterate ${stack.at(-1)}, expected Array or String`))) {
                const result = await exec_what([stack.concat([x, temp])], var_dict, output)
                arr.push(result)
            }
            stack.push(arr)
        } else if ("," === c) {
            temp = stack.pop()
            error(() => stack.push(stack.at(-1).slice(temp)[0]), () => TypeError(FE`Cannot get item in ${stack.at(-1)}, expected Array or String`))
        } else if (";" === c) {
            temp = stack.pop()
            temp2 = stack.pop()
            if (!Array.isArray(stack.at(-1))) throw TypeError(FE`Cannot set item in ${stack.at(-1)}, expected Array`)
            if ([undefined, +stack.at(-1).length].includes(temp2) || Number.isNaN(temp2)) {
                stack.at(-1).push(temp)
            } else {
                temp2 = +temp2 || 0
                if (temp2 < 0) temp2 += stack.at(-1).length
                if (temp2 >= 0) stack.at(-1).fill(temp, temp2, temp2 + 1)
            }
        } else if ("$" === c) {
            temp = stack.pop()
            if (!Array.isArray(stack.at(-1))) throw TypeError(FE`Cannot delete item in ${stack.at(-1)}, expected Array`)
            stack.at(-1).splice(temp, 1)
        }
        //console.log(stack)
        temp = void 0, temp2 = void 0
    }
    return stack.at(-1)
}
