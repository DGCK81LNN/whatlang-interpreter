import { expect } from "earl"
import { MockStack } from "./utils"

describe("__meta__", function () {
  it("MockStack", function () {
    const stack = new MockStack<number>()
    expect(() => stack.at(-1)).toThrow("Unexpected read from empty Stack")
    expect(() => stack.pop()).toThrow("Unexpected pop from empty Stack")
    expect(() => stack.splice(-2)).toThrow("Unexpected splice from empty Stack")

    stack.push(1, 2)
    expect(stack.splice(-1)).toLooseEqual([2])
    expect(() => stack.splice(-2)).toThrow(
      "Trying to splice at index -2 from the Stack, but it only contains 1 items",
    )
  })

  it("toBeSameAs", function () {
    expect(-0).toBeSameAs(-0)
    expect(() => expect(0).toBeSameAs(-0)).toThrow(
      "The value 0 is not same as -0, but it was expected to.",
    )
    expect(NaN).toBeSameAs(NaN)
    expect(new MockStack()).toBeSameAs([])
    const stack = new MockStack()
    stack.push(0)
    expect(() => expect(stack).toBeSameAs([-0])).toThrow(
      "The value MockStack [0] is not same as [-0], but it was expected to.",
    )
  })
})
