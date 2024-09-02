import { Dict, WhatValue } from "./types"
import { toBoolean, popArgs, compare, toString, add } from "./utils"

const binaryOps: Dict<(a: WhatValue, b: WhatValue) => WhatValue> = {
  "+": add,
  "-": (a, b) => Number(a) - Number(b),
  "*": (a, b) => Number(a) * Number(b),
  "/": (a, b) => Number(a) / Number(b),
  "%": (a, b) => Number(a) % Number(b),
  "?": compare,
}

export async function* evalWhat(
  code: string,
  {
    fstack = [[]] as WhatValue[][],
    varDict = Object.create(null) as Dict<WhatValue>,
    output = console.log as (value: string) => void,
    startLine = 1,
    startCol = 1,
  } = {}
) {
  let stack = fstack.at(-1)
  if (!stack) throw new Error("Internal error: invalid stack")

  for (let i = 0; i < code.length; i++) {
    let c = code[i]
    if (c === "0") {
      // zero
      stack.push(0)
    } else if (/\d/.test(c)) {
      // posint literal
      while (++i < code.length && /\d/.test(code[i])) c += code[i]
      i--
      stack.push(+c)
    } else if (/[a-zA-Z]/.test(c)) {
      // ident literal
      while (++i < code.length && /[a-zA-Z0-9_]/.test(code[i])) c += code[i]
      i--
      stack.push(c.toLowerCase())
    } else if (c === "'") {
      // char literal
      stack.push(code[++i])
    } else if (c === '"' || c === "`") {
      // string literal / literal print
      const delim = c
      let str = ""
      const escapeCharMap: Record<string, string> = {
        r: "\r",
        n: "\n",
        t: "\t",
      }
      let escape = false
      while (++i < code.length) {
        c = code[i]
        if (escape) {
          str += escapeCharMap[c] ?? c
          escape = false
        } else if (c === "\\") {
          escape = true
          continue
        } else if (c === delim) {
          break
        } else {
          str += c
        }
      }
      if (delim === "`") output(str)
      else stack.push(str)
    } else if (c in binaryOps) {
      // binary operation
      const [a, b] = popArgs(`operator ${c}`, stack, "Any", "Any")
      stack.push(binaryOps[c](a, b))
    } else if (c === "~") {
      // negate
      stack.push(+!toBoolean(stack.pop()))
    } else if (c === "[") {
      // new stack
      stack = []
      fstack.push(stack)
    } else if (c === "|") {
      // open array as stack
      ;[stack] = popArgs("instruction |", stack, "Array")
      fstack.push(stack)
    } else if (c === "]") {
      // close stack
      const arr = fstack.pop()
      if (!fstack.length) fstack.push([])
      stack = fstack.at(-1)!
      stack.push(arr)
    } else if (c === "(") {
      // paren string literal
      const start = i + 1
      let depth = 1
      while (depth > 0 && ++i < code.length) {
        c = code[i]
        if (c === "(") depth++
        else if (c === ")") depth--
      }
      stack.push(code.slice(start, i))
    } else if (c === ")") {
      throw new Error("Unmatched parenthesis")
    } else if (c === ".") {
      // print
      output(toString(stack.at(-1)))
    } else if (c === ":") {
      // duplicate
      if (stack.length) stack.push(stack.at(-1))
    } else if (c === "_") {
      // discard
      stack.pop()
    } else if (c === "=") {
      // set variable
      const [name] = popArgs("instruction =", stack, "Any")
      varDict[toString(name)] = stack.at(-1)
    } else if (c === "^") {
      // get variable
      const [name] = popArgs("instruction ^", stack, "Any")
      const strName = toString(name)
      if (Object.hasOwn(varDict, strName)) stack.push(varDict[strName])
      // TODO: handle names of builtins
      else stack.push(undefined)
    } else if (c === "@") {
      // call
      const [callable] = popArgs("instruction @", stack, "Any")
      // TODO: call it
      stack.push(toString(callable)) // placeholder
      //stack = fstack.at(-1)
    } else if (c === ">") {
      // gather
      const [count] = popArgs("instruction >", stack, "Number")
      stack.push(stack.splice(-count))
    } else if (c === "<") {
      // spread
      const [arr] = popArgs("instruction <", stack, "Array")
      stack.push(...arr)
    } else if (c === "{" || c === "}" || c === "!") {
      // while loop / break

      // breaking out of loops is similar to skipping loops whose conditions are initially false;
      // so we set cond = false when breaking
      const cond = c !== "!" && toBoolean(stack.pop())
      // true when it's the loop end
      const right = c === "}"
      // needs skipping / backtracking when either cond is false and it's the loop start,
      // or when cond is true and it's the loop end, or when breaking
      if (cond === right) {
        // 1 for skipping, -1 for backtracking
        const delta = right ? -1 : 1
        // + 1 each time a `{` is found, - 1 each time a `}` is found, including the current one
        let depth = delta
        // determine how many levels of loop we need to break out of, in case of a break
        if (c === "!") {
          // each additional `!` increases one level
          while (i < code.length && code[++i] === "!") depth++
          i--
        }
        while (depth && (i += delta) < code.length) {
          c = code[i]
          if (code[right ? i - 1 : i] === "'") {
            i += delta
          } else if (c === "(" || c === ")") {
            // FIXME
            // br i give up  perhaps check the entire code JIT and record indices of matching brackets
          } else if (c === "{") {
            depth++
          } else if (c === "}") {
            depth--
          }
        }
      }
    } else if (c === "#") {
      // array map
      const [arr, callable] = popArgs("instruction #", stack, "Array", "Any")
      // TODO
    } else if (c === ",") {
      // array get
      const [arr, ind] = popArgs("instruction ,", stack, "Array", "Any")
      let index = Number(ind)
      if (Number.isNaN(index)) index = 0
      stack.push(arr, arr.at(Math.trunc(index)))
    } else if (c === ";") {
      // array set
      const [arr, ind, value] = popArgs(
        "instruction ;",
        stack,
        "Array",
        "Any",
        "Any"
      )
      let index = Number(ind)
      if (Number.isNaN(index)) index = arr.length
      if (index > -arr.length && index <= arr.length)
        arr.splice(index, 1, value)
      stack.push(arr)
    } else if (c === "$") {
      // array delete
      const [arr, ind] = popArgs("instruction $", stack, "Array", "Any")
      let index = Number(ind)
      if (Number.isNaN(index)) index = 0
      arr.splice(index, 1)
    }
    popArgs("", stack, "Array", "Number", "Any")
    yield undefined
  }
}
