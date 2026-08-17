import { expect } from "earl"
import { MockStack } from "./utils"

describe("__meta__", function () {
  it("MockStack", function () {
    const stack = new MockStack<number>()
    expect(() => stack.at(-1)).toThrow()
    expect(() => stack.pop()).toThrow()
    expect(() => stack.splice(-2)).toThrow()

    stack.push(1, 2)
    expect(stack.splice(-1)).toLooseEqual([2])
    expect(() => stack.splice(-2)).toThrow()
  })
})
