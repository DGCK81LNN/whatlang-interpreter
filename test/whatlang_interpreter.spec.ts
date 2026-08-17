import { expect, mockFn } from "earl"
import { MockStack } from "./utils"
import {
  type WhatValue,
  type WhatContext,
  is_what_value,
  uncatchable_exception,
  is_uncatchable_exception,
  to_string,
  to_number,
  to_bool,
  formatting,
  repr_formatting,
  exec_what,
  run_what,
  eval_what,
  default_builtins,
} from "../src/whatlang_interpreter"

describe("whatlang_interpreter", function () {
  describe("utils", function () {
    describe("is_what_value", function () {
      it("test for WhatValue", function () {
        expect(is_what_value(42)).toEqual(true)
        expect(is_what_value("foo")).toEqual(true)
        expect(is_what_value(undefined)).toEqual(true)
        expect(is_what_value([42, "foo", undefined, ["a", "b"]])).toEqual(true)
        expect(is_what_value({ foo: "bar" })).toEqual(false)
        expect(is_what_value([null])).toEqual(false)
      })
      it("handle circular references", function () {
        const a: unknown[] = []
        a.push(42, ["foo", a])
        expect(is_what_value(a)).toEqual(true)

        const b: unknown[] = []
        b.push(114, [null, b])
        expect(is_what_value(b)).toEqual(false)
      })
    })

    describe("is_uncatchable_exception", function () {
      it("test for uncatchable exception", function () {
        const a = new Error("Oops")
        const b = Object.assign(new Error("oops"), {
          [uncatchable_exception]: true,
        })
        const c = undefined
        expect(is_uncatchable_exception(a)).toEqual(false)
        expect(is_uncatchable_exception(b)).toEqual(true)
        expect(is_uncatchable_exception(c)).toEqual(false)
      })
    })

    describe("to_string", function () {
      it("format non-Strings only", function () {
        expect(to_string("foo")).toEqual("foo")
        expect(to_string(["foo"])).toEqual('["foo"]')
      })
    })

    describe("to_number", function () {
      it("convert value to Number", function () {
        expect(to_number(42)).toEqual(42)
        expect(to_number("42.")).toEqual(42)
        expect(to_number("foo")).toEqual(NaN)
        expect(to_number(undefined)).toEqual(NaN)
        expect(to_number([-0])).toSatisfy(x => Object.is(x, -0))
        expect(to_number([])).toEqual(NaN)
        expect(to_number([])).toEqual(NaN)
      })
    })

    describe("to_bool", function () {
      it("convert value to boolean", function () {
        expect(to_bool(-0)).toEqual(false)
        expect(to_bool(42)).toEqual(true)
        expect(to_bool(NaN)).toEqual(true)

        expect(to_bool("")).toEqual(false)
        expect(to_bool("foo")).toEqual(true)

        expect(to_bool(undefined)).toEqual(false)

        expect(to_bool([])).toEqual(true)
      })
    })

    describe("formatting", function () {
      it("format values", function () {
        expect(formatting(42)).toEqual("42")
        expect(formatting(NaN)).toEqual("NaN")
        expect(formatting(Infinity)).toEqual("Inf")
        expect(formatting(-Infinity)).toEqual("-Inf")

        expect(formatting("foo")).toEqual('"foo"')
        expect(formatting("\b\f\n\r\t")).toEqual('"\\b\\f\\n\\r\\t"')

        expect(formatting(undefined)).toEqual("undef")

        expect(formatting([42, "foo", []])).toEqual('[42, "foo", []]')
      })
      it("multiline Strings and Arrays", function () {
        const str = "12345678\n".repeat(6)
        expect(formatting(str)).toEqual(
          /* prettier-ignore */ [
            '"12345678\\n"\n',
            '  "12345678\\n"\n'.repeat(4),
            '  "12345678\\n"'
          ].join(""),
        )
        expect(formatting(str.slice(0, -1))).toEqual(
          /* prettier-ignore */ [
            '"12345678\\n"\n',
            '  "12345678\\n"\n'.repeat(4),
            '  "12345678"',
          ].join(""),
        )
        expect(formatting([str, 42, str.slice(0, -1)])).toEqual(
          /* prettier-ignore */ [
            '[\n',
            '  "12345678\\n"\n',
            '    "12345678\\n"\n'.repeat(4),
            '    "12345678\\n",\n',
            '  42,\n',
            '  "12345678\\n"\n',
            '    "12345678\\n"\n'.repeat(4),
            '    "12345678"\n',
            ']'
          ].join(""),
        )
      })
      it("truncate long Strings", function () {
        expect(formatting("A".repeat(100), { maxStringLength: 50 })).toEqual(
          `"${"A".repeat(50)}"... 50 more chars`,
        )
        expect(formatting("A".repeat(51), { maxStringLength: 50 })).toEqual(
          `"${"A".repeat(50)}"... 1 more char`,
        )
        expect(formatting("A" + "😨".repeat(25), { maxStringLength: 50 })).toEqual(
          `"A${"😨".repeat(24)}"... 2 more chars`,
        )
      })
      it("truncate long Arrays", function () {
        expect(formatting(Array(8).fill(42), { maxArrayLength: 4 })).toEqual(
          `[42, 42, 42, 42, ... 4 more items]`,
        )
        expect(formatting(["12345678\n".repeat(6), 42, 42, 42, 42], { maxArrayLength: 4 })).toEqual(
          /* prettier-ignore */ [
            '[\n',
            '  "12345678\\n"\n',
            '    "12345678\\n"\n'.repeat(4),
            '    "12345678\\n",\n',
            '  42,\n'.repeat(3),
            '  ... 1 more item\n',
            ']'
          ].join(""),
        )
      })
      it("handle deep and circular Arrays", function () {
        expect(formatting([1, [2, [3, [4, [5]]]]], { depth: 2 })).toEqual("[1, [2, [3, [...]]]]")

        const a: WhatValue[] = []
        a.push("foo", [42, a])
        expect(formatting(a)).toEqual('["foo", [42, [...circular]]]')
      })
    })

    describe("repr_formatting", function () {
      it("represent values", async function () {
        const selfReferencing: WhatValue[] = [42]
        selfReferencing.push(selfReferencing)

        const value = [
          "foo",
          "fooBar",
          '())"\\\b\t\n\f\r(',
          42,
          9.9999e20,
          1e21,
          -0,
          NaN,
          Infinity,
          -Infinity,
          undefined,
          selfReferencing,
        ]
        const { result } = await run_what(repr_formatting(value))
        expect(result).toEqual(value)
      })
    })
  })

  describe("api", function () {
    describe("exec_what", function () {
      it("call function", async function () {
        const builtins: WhatContext["builtins"] = {
          foo: () => 42,
          bar: x => Promise.resolve(["world", x]),
          baz: (x, y) => [y, x],
        }
        const stack: WhatValue[] = ["hi", "foo"]
        const ctx: WhatContext = {
          fstack: [stack],
          builtins,
          var_dict: {},
          output: mockFn(),
        }
        expect(await exec_what(ctx)).toEqual(42)
        expect(ctx.fstack).toEqual([["hi", 42]])

        stack.push("bar")
        expect(await exec_what(ctx)).toEqual(["world", 42])
        expect(ctx.fstack).toEqual([["hi", ["world", 42]]])

        stack.push("baz")
        expect(await exec_what(ctx)).toEqual([["world", 42], "hi"])
        expect(ctx.fstack).toEqual([[[["world", 42], "hi"]]])
      })
      it("call user function", async function () {
        const var_dict: WhatContext["var_dict"] = {
          foo: "42!34",
          bar: "[world",
          baz: 66,
        }
        const ctx: WhatContext = {
          fstack: [["hi", "foo"]],
          builtins: { bar: mockFn() },
          var_dict,
          output: mockFn(),
        }
        expect(await exec_what(ctx)).toEqual(42)
        expect(ctx.fstack).toEqual([["hi", 42]])

        ctx.fstack = [["hi", "bar"]]
        expect(await exec_what(ctx)).toEqual("world")
        expect(ctx.fstack).toEqual([["hi"], ["world"]])

        ctx.fstack = [["hi", "baz"]]
        await expect(() => exec_what(ctx)).toBeRejectedWith("Cannot evaluate 66, expected String")
        expect(ctx.fstack).toEqual([["hi"]])

        ctx.fstack = [["hi", "]nope"]]
        expect(await exec_what(ctx)).toEqual("nope")
        expect(ctx.fstack).toEqual([[["hi"], "nope"]])
      })
    })

    describe("run_what", function () {
      it("collects output", async function () {
        expect(await run_what("114.`514`")).toHaveSubset({
          result: 114,
          output: "114514",
        })
      })
    })

    describe("eval_what", function () {
      it("dead_loop_check", async function () {
        let n = 0
        const dead_loop_check = mockFn(() => ++n > 100)
        const ctx: WhatContext = {
          fstack: [[]],
          builtins: default_builtins,
          var_dict: {},
          output: mockFn(),
          dead_loop_check,
        }
        await expect(() => eval_what("1{1}", ctx)).toBeRejectedWith("Execution timeout")
        expect(dead_loop_check).toHaveBeenCalledTimes(101)
      })
      it("eof", async function () {
        const ctx: WhatContext = {
          fstack: [[1]],
          builtins: default_builtins,
          var_dict: {},
          output: mockFn(),
        }
        expect(await eval_what(":{!!}", ctx)).toEqual({
          result: 1,
          eof: false,
        })
        ctx.fstack = [[0]]
        expect(await eval_what(":{!!}", ctx)).toEqual({
          result: 0,
          eof: true,
        })
      })
    })
  })

  async function testEvalWhat(
    code: string,
    ctxOverrides: Partial<WhatContext> | null = null,
    expectedFstack?: WhatValue[][],
    //expectedResult?: Partial<EvalWhatResult>,
  ) {
    const ctx: WhatContext = {
      fstack: [new MockStack()],
      builtins: default_builtins,
      var_dict: {},
      output: mockFn(),
      ...ctxOverrides,
    }
    const result = await eval_what(code, ctx)
    if (expectedFstack != null) expect(ctx.fstack).toLooseEqual(expectedFstack)
    //if (expectedResult != null) expect(result).toHaveSubset(expectedResult)
    return result
  }
  const FS = (...args: WhatValue[]) => [MockStack.from<WhatValue>(args)]

  describe("instructions", function () {
    it("posint literal", async function () {
      await testEvalWhat("1140", {}, [[1140]])
    })
    it("0", async function () {
      await testEvalWhat("007", {}, [[0, 0, 7]])
    })
    it("word literal", async function () {
      await testEvalWhat("what_", {}, [["what_"]])
    })
    it("'", async function () {
      await testEvalWhat("'😨'!!", {}, [["😨", "!"]])
    })
    it('"', async function () {
      await testEvalWhat('"foo\nbar"', {}, [["foo\nbar"]])
      await testEvalWhat('"\\b\\f\\n\\r\\t"', {}, [["\b\f\n\r\t"]])
      await expect(() => testEvalWhat('"aaa')).toBeRejectedWith("Unterminated String")
    })
    it("`", async function () {
      const fstack = FS(0)
      const output = mockFn().returns(undefined)
      await testEvalWhat("`foo\nbar`", { fstack, output }, [[0]])
      expect(output).toHaveBeenLastCalledWith("foo\nbar")
      await testEvalWhat("`\\b\\f\\n\\r\\t`", { fstack, output }, [[0]])
      expect(output).toHaveBeenLastCalledWith("\b\f\n\r\t")
      await testEvalWhat("`aaa", { fstack, output }, [[0]])
      expect(output).toHaveBeenLastCalledWith("aaa")
    })
    it("+", async function () {
      await testEvalWhat("+", { fstack: FS(114, 514) }, [[628]])
      await testEvalWhat("+", { fstack: FS(114, undefined) }, [[NaN]])
      await testEvalWhat("+", { fstack: FS(undefined, undefined) }, [[NaN]])
    })
    it("+ (Strings)", async function () {
      await testEvalWhat("+", { fstack: FS("ab", "c") }, [["abc"]])
      await testEvalWhat("+", { fstack: FS("ab", 3) }, [["ab3"]])
      await testEvalWhat("+", { fstack: FS(undefined, "bc") }, [["undefbc"]])
    })
    it("+ (Arrays)", async function () {
      await testEvalWhat("+", { fstack: FS(["a", "b"], ["c"]) }, [[["a", "b", "c"]]])
      await testEvalWhat("+", { fstack: FS(["a", "b"], 3) }, [[["a", "b", 3]]])
      await testEvalWhat("+", { fstack: FS(undefined, ["b", "c"]) }, [[[undefined, "b", "c"]]])
    })
    it("-", async function () {
      await testEvalWhat("-", { fstack: FS(114, "514") }, [[-400]])
      await testEvalWhat("-", { fstack: FS("114", undefined) }, [[NaN]])
      await testEvalWhat("-", { fstack: FS(undefined, undefined) }, [[NaN]])
    })
    it("*", async function () {
      await testEvalWhat("*", { fstack: FS(114, "514") }, [[114 * 514]])
      await testEvalWhat("*", { fstack: FS("114", undefined) }, [[NaN]])
      await testEvalWhat("*", { fstack: FS(undefined, undefined) }, [[NaN]])
    })
    it("/", async function () {
      await testEvalWhat("/", { fstack: FS(114, "514") }, [[114 / 514]])
      await testEvalWhat("/", { fstack: FS("114", undefined) }, [[NaN]])
      await testEvalWhat("/", { fstack: FS(undefined, undefined) }, [[NaN]])
    })
    it("%", async function () {
      await testEvalWhat("%", { fstack: FS(114, "514") }, [[114 % 514]])
      await testEvalWhat("%", { fstack: FS("114", undefined) }, [[NaN]])
      await testEvalWhat("%", { fstack: FS(undefined, undefined) }, [[NaN]])
    })
    it("?", async function () {
      await testEvalWhat("?", { fstack: FS(1, 1) }, [[0]])
      await testEvalWhat("?", { fstack: FS("1.0", 1) }, [[0]])
      await testEvalWhat("?", { fstack: FS(2, 1) }, [[1]])
      await testEvalWhat("?", { fstack: FS("", 2) }, [[-1]])
      await testEvalWhat("?", { fstack: FS(1, "foo") }, [[NaN]])
      await testEvalWhat("?", { fstack: FS(undefined, 1) }, [[NaN]])
      await testEvalWhat("?", { fstack: FS(NaN, NaN) }, [[NaN]])
      await testEvalWhat("?", { fstack: FS(undefined, undefined) }, [[0]])
    })
    it("? (Strings)", async function () {
      await testEvalWhat("?", { fstack: FS("", "") }, [[0]])
      await testEvalWhat("?", { fstack: FS("12", "12") }, [[0]])
      await testEvalWhat("?", { fstack: FS("2", "12") }, [[1]])
      await testEvalWhat("?", { fstack: FS("1", "12") }, [[-1]])
      await testEvalWhat("?", { fstack: FS("10", "12") }, [[-1]])
    })
    it("? (Arrays)", async function () {
      await testEvalWhat("?", { fstack: FS([], []) }, [[0]])
      await testEvalWhat("?", { fstack: FS([1, "a"], [1, "a"]) }, [[0]])
      await testEvalWhat("?", { fstack: FS(2, [1, "a"]) }, [[1]])
      await testEvalWhat("?", { fstack: FS([1], [1, "a"]) }, [[-1]])
      await testEvalWhat("?", { fstack: FS([1, 0], [1, 2]) }, [[-1]])
      await testEvalWhat("?", { fstack: FS([1, NaN], 1) }, [[1]])
    })
    it("~", async function () {
      await testEvalWhat("~", { fstack: FS(0) }, [[1]])
      await testEvalWhat("~", { fstack: FS(1) }, [[0]])
      await testEvalWhat("~", { fstack: FS(NaN) }, [[0]])
      await testEvalWhat("~", { fstack: FS("") }, [[1]])
      await testEvalWhat("~", { fstack: FS("a") }, [[0]])
      await testEvalWhat("~", { fstack: FS(undefined) }, [[1]])
      await testEvalWhat("~", { fstack: FS([]) }, [[0]])
    })
    it("[", async function () {
      await testEvalWhat("[", { fstack: FS("a") }, [["a"], []])
    })
    it("|", async function () {
      await testEvalWhat("|", { fstack: FS("a", ["b"]) }, [["a"], ["b"]])
      await expect(() => testEvalWhat("|", { fstack: FS("a") })).toBeRejectedWith(
        'Cannot open "a" as Stack',
      )
    })
    it("]", async function () {
      await testEvalWhat("]", { fstack: [["a"], ["b"]] }, [["a", ["b"]]])
      await testEvalWhat("]", { fstack: FS("a") }, [[["a"]]])
    })
    it("()", async function () {
      await testEvalWhat("((a))", {}, [["(a)"]])
      await expect(() => testEvalWhat("(a", {})).toBeRejectedWith("Unterminated String")
      await expect(() => testEvalWhat("a)", {})).toBeRejectedWith("Unexpected token ')'")
    })
    it(".", async function () {
      const output = mockFn().returns(undefined)
      await testEvalWhat(".", { fstack: FS("a"), output }, [["a"]])
      expect(output).toHaveBeenLastCalledWith("a")
    })
    it("\\", async function () {
      await testEvalWhat("\\", { fstack: FS("a", "b") }, [["b", "a"]])
      await testEvalWhat("\\", { fstack: FS("a") }, [["a"]])
      await testEvalWhat("\\", { fstack: [[]] }, [[]])
    })
    it("&", async function () {
      await testEvalWhat("&", { fstack: FS("a", "b", "c") }, [["c", "a", "b"]])
      await testEvalWhat("&", { fstack: [[]] }, [[]])
    })
    it(":", async function () {
      await testEvalWhat(":", { fstack: FS("a") }, [["a", "a"]])
      await testEvalWhat(":", { fstack: [[]] }, [[]])
    })
    it("_", async function () {
      await testEvalWhat("_", { fstack: FS("a", "b") }, [["a"]])
      await testEvalWhat("_", { fstack: [[]] }, [[]])
    })
    it("=", async function () {
      const var_dict = {}
      await testEvalWhat("=", { fstack: FS("a", "b"), var_dict }, [["a"]])
      expect(var_dict).toEqual({ b: "a" })
      await expect(() => testEvalWhat("=", { fstack: FS("a", 6), var_dict })).toBeRejectedWith(
        "Invalid variable name 6 for assignment, expected String",
      )
    })
    it("^", async function () {
      const var_dict = { foo: 42 }
      await testEvalWhat("^", { fstack: FS("foo"), var_dict }, [[42]])
      await testEvalWhat("^", { fstack: FS("bar"), var_dict }, [[undefined]])
      await testEvalWhat("^", { fstack: FS("num"), var_dict }, [["num@"]])
      await expect(() => testEvalWhat("^", { fstack: FS(6), var_dict })).toBeRejectedWith(
        "Invalid variable name 6 for retrieval, expected String",
      )
    })
    it("@", async function () {
      const builtins: WhatContext["builtins"] = { bar: x => [x, 42] }
      const var_dict = { foo: "6!" }
      await testEvalWhat("@", { fstack: FS("0!"), builtins, var_dict }, [[0]])
      await testEvalWhat("@", { fstack: FS("foo"), builtins, var_dict }, [[6]])
      await testEvalWhat("@", { fstack: FS("hi", "bar"), builtins, var_dict }, [[["hi", 42]]])
    })
    it(">", async function () {
      await testEvalWhat(">", { fstack: FS("a", ["b"], "c", 2) }, [["a", [["b"], "c"]]])
      await testEvalWhat(">", { fstack: FS("a", ["b"], "c", 0) }, [[["a", ["b"], "c"]]])
      await testEvalWhat(">", { fstack: FS("a", ["b"], "c", -2) }, [["a", ["b"], ["c"]]])
    })
    it("<", async function () {
      await testEvalWhat("<", { fstack: FS("a", ["b", ["c"]]) }, [["a", "b", ["c"]]])
      await testEvalWhat("<", { fstack: FS("a", "b", []) }, [["a", "b"]])
      await expect(() => testEvalWhat("<", { fstack: FS("foo") })).toBeRejectedWith(
        'Cannot spread "foo", expected Array',
      )
    })
    it("{}", async function () {
      const code = '{ `hi` \'`_ (()})_ "\\"`("_ 0{`}`} } `bye`'
      const output = mockFn().returns(undefined)
      await testEvalWhat(code, { fstack: FS(-1, 0, 1, 1), output }, [[-1]])
      expect(output).toHaveBeenNthCalledWith(1, "hi")
      expect(output).toHaveBeenNthCalledWith(2, "hi")
      expect(output).toHaveBeenNthCalledWith(3, "bye")
      expect(output).toHaveBeenCalledTimes(3)

      output.reset()
      output.returns(undefined)
      await testEvalWhat(code, { fstack: FS(-1, 0), output }, [[-1]])
      expect(output).toHaveBeenOnlyCalledWith("bye")

      await expect(() => testEvalWhat("{", { fstack: FS("") })).toBeRejectedWith(
        "Unterminated loop",
      )
      await expect(() => testEvalWhat("}", { fstack: FS(NaN) })).toBeRejectedWith(
        "Unexpected token '}'",
      )
    })
    it("!", async function () {
      const output = mockFn().returns(undefined)
      await testEvalWhat(
        '{ `bye` ! \'`_ (()})_ "\\"`("_ 0{`}`} } `hi`',
        { fstack: FS(-1, 1), output },
        [[-1]],
      )
      expect(output).toHaveBeenNthCalledWith(1, "bye")
      expect(output).toHaveBeenNthCalledWith(2, "hi")
      expect(output).toHaveBeenCalledTimes(2)

      output.reset()
      output.returns(undefined)
      await testEvalWhat(
        '{ `bye` !! \'`_ (()})_ "\\"`("_ 0{`}`} } `hi`',
        { fstack: FS(-1, 1), output },
        [[-1]],
      )
      expect(output).toHaveBeenOnlyCalledWith("bye")
    })
    it("#", async function () {
      await testEvalWhat("#", { fstack: FS([1, 2, 3], "10+") }, [
        [
          [1, 2, 3],
          [11, 12, 13],
        ],
      ])
      await testEvalWhat("#", { fstack: FS("abc", "z+") }, [["abc", ["az", "bz", "cz"]]])
      await expect(() => testEvalWhat("#", { fstack: FS(6, "") })).toBeRejectedWith(
        "Cannot iterate 6, expected Array or String",
      )
    })
    it(",", async function () {
      await testEvalWhat(",", { fstack: FS([11, 12, 13], 1) }, [[[11, 12, 13], 12]])
      await testEvalWhat(",", { fstack: FS("abcdef", "-2.2") }, [["abcdef", "e"]])
      await testEvalWhat(",", { fstack: FS("abcdef", Infinity) }, [["abcdef", undefined]])
      await testEvalWhat(",", { fstack: FS([11, 12, 13], -4) }, [[[11, 12, 13], undefined]])
      await testEvalWhat(",", { fstack: FS([11, 12, 13], "foo") }, [[[11, 12, 13], undefined]])
      await testEvalWhat(",", { fstack: FS([11, 12, 13], undefined) }, [[[11, 12, 13], undefined]])
      await expect(() => testEvalWhat(",", { fstack: FS(6, 1) })).toBeRejectedWith(
        "Cannot get item in 6, expected Array or String",
      )
    })
    it(";", async function () {
      await testEvalWhat(";", { fstack: FS([11, 12, 13], 1, 42) }, [[[11, 42, 13]]])
      await testEvalWhat(";", { fstack: FS([11, 12, 13], -1.5, 42) }, [[[11, 12, 42]]])
      await testEvalWhat(";", { fstack: FS([11, 12, 13], "3", 42) }, [[[11, 12, 13, 42]]])
      await testEvalWhat(";", { fstack: FS([11, 12, 13], -4, 42) }, [[[11, 12, 13]]])
      await testEvalWhat(";", { fstack: FS([11, 12, 13], NaN, 42) }, [[[11, 12, 13, 42]]])
      await testEvalWhat(";", { fstack: FS([11, 12, 13], undefined, 42) }, [[[11, 12, 13, 42]]])
      await expect(() => testEvalWhat(";", { fstack: FS("abcdef", 1, 42) })).toBeRejectedWith(
        'Cannot set item in "abcdef", expected Array',
      )
      await expect(() => testEvalWhat(";", { fstack: FS([11, 12, 13], "a", 42) })).toBeRejectedWith(
        'Invalid index "a" for setting item in Array',
      )
    })
    it("$", async function () {
      await testEvalWhat("$", { fstack: FS([11, 12, 13], 2) }, [[[11, 12]]])
      await testEvalWhat("$", { fstack: FS([11, 12, 13], "-2.2") }, [[[11, 13]]])
      await testEvalWhat("$", { fstack: FS([11, 12, 13], 3) }, [[[11, 12, 13]]])
      await testEvalWhat("$", { fstack: FS([11, 12, 13], -4) }, [[[11, 12, 13]]])
      await testEvalWhat("$", { fstack: FS([11, 12, 13], NaN) }, [[[11, 12, 13]]])
      await testEvalWhat("$", { fstack: FS([11, 12, 13], undefined) }, [[[11, 12, 13]]])
      await expect(() => testEvalWhat("$", { fstack: FS("abcdef", 1) })).toBeRejectedWith(
        'Cannot delete item in "abcdef", expected Array',
      )
      await expect(() => testEvalWhat("$", { fstack: FS([11, 12, 13], "a") })).toBeRejectedWith(
        'Invalid index "a" for deleting item in Array',
      )
    })
  })

  describe("builtins", function () {
    it("num@", async function () {
      await testEvalWhat("num@", { fstack: FS("42") }, [[42]])
    })
    it("str@", async function () {
      await testEvalWhat("str@", { fstack: FS("foo") }, [["foo"]])
      await testEvalWhat("str@", { fstack: FS(["a", "b"]) }, [['["a", "b"]']])
    })
    it("repr@", async function () {
      const value = ["foo", 42]
      await testEvalWhat("repr@@", { fstack: FS(value) }, [[value]])
    })
    it("arr@", async function () {
      await testEvalWhat("arr@", { fstack: FS("A文😨") }, [[["A", "文", "😨"]]])
      await expect(() => testEvalWhat("arr@", { fstack: FS(6) })).toBeRejectedWith(
        "Cannot convert 6 to Array, expected Array or String",
      )
    })
    it("pow@", async function () {
      await testEvalWhat("pow@", { fstack: FS(2, ".5") }, [[Math.SQRT2]])
    })
    it("sin@", async function () {
      await testEvalWhat("sin@", { fstack: FS(1) }, [[Math.sin(1)]])
    })
    it("cos@", async function () {
      await testEvalWhat("cos@", { fstack: FS(1) }, [[Math.cos(1)]])
    })
    it("tan@", async function () {
      await testEvalWhat("tan@", { fstack: FS(1) }, [[Math.tan(1)]])
    })
    it("asin@", async function () {
      await testEvalWhat("asin@", { fstack: FS(1) }, [[Math.asin(1)]])
    })
    it("acos@", async function () {
      await testEvalWhat("acos@", { fstack: FS(0.5) }, [[Math.acos(0.5)]])
    })
    it("atan@", async function () {
      await testEvalWhat("atan@", { fstack: FS(1) }, [[Math.atan(1)]])
    })
    it("band@", async function () {
      await testEvalWhat("band@", { fstack: FS(3, -2) }, [[2]])
    })
    it("bor@", async function () {
      await testEvalWhat("bor@", { fstack: FS(3, -2) }, [[-1]])
    })
    it("bxor@", async function () {
      await testEvalWhat("bxor@", { fstack: FS(3, -2) }, [[-3]])
    })
    it("bnot@", async function () {
      await testEvalWhat("bnot@", { fstack: FS(3) }, [[-4]])
    })
    it("rand@", async function () {
      await testEvalWhat("rand@", { fstack: FS() }, [[expect.between(0, 1)]])
    })
    it("randint@", async function () {
      const { result } = await testEvalWhat("randint@", { fstack: FS(1, 3) }, [[expect.integer()]])
      expect(result as number).toBeAnInteger()
      expect(result as number).toBeBetween(1, 2)
    })
    it("flr@", async function () {
      await testEvalWhat("flr@", { fstack: FS("-3.6") }, [[-4]])
    })
    it("range@", async function () {
      await testEvalWhat("range@", { fstack: FS(5) }, [[[0, 1, 2, 3, 4]]])
      await testEvalWhat("range@", { fstack: FS(0) }, [[[]]])
    })
    it("len@", async function () {
      await testEvalWhat("len@", { fstack: FS(["a", "b"]) }, [[["a", "b"], 2]])
      await testEvalWhat("len@", { fstack: FS("abc") }, [["abc", 3]])
      await testEvalWhat("len@", { fstack: FS([]) }, [[[], 0]])
      await testEvalWhat("len@", { fstack: FS("") }, [["", 0]])
      await testEvalWhat("len@", { fstack: FS(6) }, [[6, undefined]])
      await expect(() => testEvalWhat("len@", { fstack: FS(undefined) })).toBeRejectedWith(
        "Cannot get length of undef, expected Array or String",
      )
    })
    it("split@", async function () {
      await testEvalWhat("split@", { fstack: FS("1 2 3", " ") }, [[["1", "2", "3"]]])
      await testEvalWhat("split@", { fstack: FS("文😨", "") }, [[["文", "\ud83d", "\ude28"]]])
      await testEvalWhat("split@", { fstack: FS("1  2\n3", ["\\s+"]) }, [[["1", "2", "3"]]])
      await testEvalWhat("split@", { fstack: FS("1Aa2", ["(a+)", "i"]) }, [[["1", "Aa", "2"]]])
      await testEvalWhat("split@", { fstack: FS("A文😨", ["", "u"]) }, [[["A", "文", "😨"]]])
      await testEvalWhat("split@", { fstack: FS("abc", []) }, [[["a", "b", "c"]]])
      await testEvalWhat("split@", { fstack: FS("a1b1c", 1) }, [[["a", "b", "c"]]])
      await testEvalWhat("split@", { fstack: FS("abc", undefined) }, [[["abc"]]])
    })
    it("join@", async function () {
      await testEvalWhat("join@", { fstack: FS(["a", "b", "c"], ",") }, [
        [["a", "b", "c"], "a,b,c"],
      ])
      await testEvalWhat("join@", { fstack: FS([["a"], ["b"]], ",") }, [
        [[["a"], ["b"]], '["a"],["b"]'],
      ])
      await expect(() => testEvalWhat("join@", { fstack: FS(6, ",") })).toBeRejectedWith(
        "Cannot join 6, expected Array or String",
      )
    })
    it("reverse@", async function () {
      await testEvalWhat("reverse@", { fstack: FS(["a", "b", "c"]) }, [
        [
          ["a", "b", "c"],
          ["c", "b", "a"],
        ],
      ])
      await testEvalWhat("reverse@", { fstack: FS("abc") }, [["abc", "cba"]])
      await expect(() => testEvalWhat("reverse@", { fstack: FS(6) })).toBeRejectedWith(
        "Cannot reverse 6, expected Array or String",
      )
    })
    it("in@", async function () {
      await testEvalWhat("in@", { fstack: FS(["a", "b", "c"], "b") }, [[["a", "b", "c"], 1]])
      await testEvalWhat("in@", { fstack: FS("abcd", "bc") }, [["abcd", 1]])
      await expect(() => testEvalWhat("in@", { fstack: FS(67, 7) })).toBeRejectedWith(
        "Cannot find index of item in 67, expected Array or String",
      )
    })
    it("filter@", async function () {
      await testEvalWhat("filter@", { fstack: FS(["0", 2, "c", ""], "num") }, [
        [
          ["0", 2, "c", ""],
          [2, "c"],
        ],
      ])
      await testEvalWhat("filter@", { fstack: FS("02c", "num") }, [["02c", ["2", "c"]]])
      await expect(() => testEvalWhat("filter@", { fstack: FS(6, "num") })).toBeRejectedWith(
        "Cannot filter 6, expected Array or String",
      )
    })
    it("chr@", async function () {
      await testEvalWhat("chr@", { fstack: FS([65, 66]) }, [["AB"]])
      await testEvalWhat("chr@", { fstack: FS(65) }, [["A"]])
      await expect(() => testEvalWhat("chr@", { fstack: FS([65, "B"]) })).toBeRejectedWith(
        'Invalid code point "B" for character',
      )
      await expect(() => testEvalWhat("chr@", { fstack: FS(undefined) })).toBeRejectedWith(
        "Invalid code point undef for character",
      )
    })
    it("ord@", async function () {
      await testEvalWhat("ord@", { fstack: FS("AB") }, [[[65, 66]]])
      await testEvalWhat("ord@", { fstack: FS(undefined) }, [[[117, 110, 100, 101, 102]]])
      await testEvalWhat("ord@", { fstack: FS([6, "😨"]) }, [
        [[91, 54, 44, 32, 34, 0x1f628, 34, 93]],
      ])
      await testEvalWhat("ord@", { fstack: FS("\ude28\ud83d") }, [[[0xde28, 0xd83d]]])
    })
    it("and@", async function () {
      await testEvalWhat("and@", { fstack: FS(NaN, 2) }, [[2]])
      await testEvalWhat("and@", { fstack: FS("", 2) }, [[""]])
    })
    it("or@", async function () {
      await testEvalWhat("or@", { fstack: FS("", 2) }, [[2]])
      await testEvalWhat("or@", { fstack: FS(NaN, 2) }, [[NaN]])
    })
    it("nan@", async function () {
      await testEvalWhat("nan@", {}, [[NaN]])
    })
    it("undef@", async function () {
      await testEvalWhat("undef@", {}, [[undefined]])
    })
    it("inf@", async function () {
      await testEvalWhat("inf@", {}, [[Infinity]])
    })
    it("ninf@", async function () {
      await testEvalWhat("ninf@", {}, [[-Infinity]])
    })
    it("eq@", async function () {
      await testEvalWhat("eq@", { fstack: FS(1, 1) }, [[1]])
      await testEvalWhat("eq@", { fstack: FS(1, "1") }, [[0]])
      await testEvalWhat("eq@", { fstack: FS([1], [1]) }, [[0]])
      await testEvalWhat("eq@", { fstack: FS(NaN, NaN) }, [[0]])
    })
    it("stak@", async function () {
      const expected: WhatValue[] = ["hi"]
      expected.push(expected)
      await testEvalWhat("stak@", { fstack: FS("hi") }, [expected])
    })
    it("stack@", async function () {
      await testEvalWhat("stack@", { fstack: FS("hi") }, [["hi", ["hi"]]])
    })
    it("throw@ and try@", async function () {
      await expect(() => testEvalWhat("throw@", { fstack: FS("Foo") })).toBeRejectedWith("Foo")
      await testEvalWhat("try@", { fstack: FS("a[b[c throw@") }, [["a", ["b", []], ["Error", "c"]]])
      await testEvalWhat("try@", { fstack: FS("a") }, [["a", [undefined, undefined]]])
    })
    it("match@", async function () {
      await testEvalWhat("match@", { fstack: FS("-hi-world-", "\\w+") }, [[["hi"]]])
      await testEvalWhat("match@", { fstack: FS("-hi-world-", ["\\w+", "g"]) }, [[["hi", "world"]]])
      await testEvalWhat("match@", { fstack: FS("---", "\\w+") }, [[[]]])
      await testEvalWhat("match@", { fstack: FS("---", ["\\w+", "g"]) }, [[[]]])
      await testEvalWhat("match@", { fstack: FS("-hi-world-", []) }, [[[""]]])
      await testEvalWhat("match@", { fstack: FS("aaundefined", undefined) }, [[[""]]])
    })
    it("repl@", async function () {
      await testEvalWhat("repl@", { fstack: FS("hi-\\w", "\\w", 1) }, [["hi-1"]])
      await testEvalWhat("repl@", { fstack: FS("hi-w", ["\\w+", "g"], 1) }, [["1-1"]])
      await testEvalWhat("repl@", { fstack: FS("hi-w", ["\\w+"], "$$$&$$") }, [["$hi$-w"]])
      await testEvalWhat("repl@", { fstack: FS("hi-w", ["(\\w)\\w*", "g"], "[$1]") }, [["[h]-[w]"]])
      await testEvalWhat("repl@", { fstack: FS("hi-w", [], 1) }, [["1hi-w"]])
      await testEvalWhat("repl@", { fstack: FS("aaundefined", undefined, 1) }, [["aaundefined"]])
    })
    it("time@", async function () {
      await testEvalWhat("time@", {}, [[expect.closeTo(Date.now(), 100)]])
    })
    it("type@", async function () {
      await testEvalWhat("type@", { fstack: FS(42) }, [["Number"]])
      await testEvalWhat("type@", { fstack: FS("foo") }, [["String"]])
      await testEvalWhat("type@", { fstack: FS([6]) }, [["Array"]])
      await testEvalWhat("type@", { fstack: FS(undefined) }, [["Undefined"]])
    })
    it("b64@", async function () {
      await testEvalWhat("b64@", { fstack: FS([1, 1, 1, 1]) }, [["AQEBAQ=="]])
      await expect(() => testEvalWhat("b64@", { fstack: FS(6) })).toBeRejectedWith(
        "Cannot convert 6 to Base64, expected Array",
      )
    })
    it("nb64@", async function () {
      await testEvalWhat("nb64@", { fstack: FS("AQID") }, [[[1, 2, 3]]])
      await testEvalWhat("nb64@", { fstack: FS("AQIDAQ==") }, [[[1, 2, 3, 1]]])
      await testEvalWhat("nb64@", { fstack: FS("AQID AQL") }, [[[1, 2, 3, 1, 2]]])
      await testEvalWhat("nb64@", { fstack: FS("AQID A") }, [[[1, 2, 3]]])
    })
    it("utf8@", async function () {
      await testEvalWhat("utf8@", { fstack: FS("A一") }, [[[65, 0xe4, 0xb8, 0x80]]])
      await testEvalWhat("utf8@", { fstack: FS([42]) }, [[[91, 52, 50, 93]]])
    })
    it("nutf8@", async function () {
      await testEvalWhat("nutf8@", { fstack: FS([65, 0xe4, 0xb8, 0x80]) }, [["A一"]])
      await testEvalWhat("nutf8@", { fstack: FS([0xe4]) }, [["\ufffd"]])
      await expect(() => testEvalWhat("nutf8@", { fstack: FS(6) })).toBeRejectedWith(
        "Cannot decode 6 from UTF-8, expected Array",
      )
    })
  })
})
