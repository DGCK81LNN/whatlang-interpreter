import { type Control, LOOSE_EQUALITY_OPTIONS, format, isEqual, registerValidator } from "earl"

/**
 * Custom subclass of `Array` that throws when peeking at or popping from it when it is empty, or
 * splicing more items than it has from its end.
 */
export class MockStack<T> extends Array<T> {
  at(index: number) {
    if (!this.length) throw new TypeError(`Unexpected read from empty Stack`)
    return super.at(index)
  }
  pop() {
    if (!this.length) throw new TypeError(`Unexpected pop from empty Stack`)
    return super.pop()
  }
  splice(start: number, deleteCount?: number, ...rest: T[]): T[]
  splice(start: number, ...rest: [number, ...T[]]) {
    if (rest[0] !== 0 && !this.length) throw new TypeError(`Unexpected splice from empty Stack`)
    if (start && this.length < -start)
      throw new RangeError(
        `Trying to splice at index ${start} from the Stack, but it only contains ${this.length} items`,
      )
    return super.splice(start, ...rest)
  }
}

declare module "earl" {
  interface Validators<T> {
    /**
     * Custom validator: asserts that a value is same as another value. The identity is checked
     * using the `isEqual` function with `ignorePrototypes: true` and `minusZero: true`. This means
     * that it checks objects recursively, treating `0` and `-0` as different but ignoring object
     * prototypes.
     */
    toBeSameAs(expected: T): void
  }
}
const SAME_FORMAT_OPTIONS = {
  compareErrorStack: false,
  ignorePrototypes: false,
  minusZero: true,
  uniqueNaNs: false,
  indentSize: 0,
  inline: true,
  maxLineLength: 30,
  skipMatcherReplacement: true,
  requireStrictEquality: false,
  splitMultilineStrings: false,
}
registerValidator("toBeSameAs", (control: Control, expected: unknown) => {
  const actualInline = () => format(control.actual, null, SAME_FORMAT_OPTIONS)
  const expectedInline = () => format(expected, null, SAME_FORMAT_OPTIONS)

  control.assert({
    success: isEqual(control.actual, expected, { ...LOOSE_EQUALITY_OPTIONS, minusZero: true }),
    reason: () =>
      `The value ${actualInline()} is not same as ${expectedInline()}, but it was expected to.`,
    negatedReason: () =>
      `The value ${actualInline()} is same as ${expectedInline()}, but it was expected not to.`,
    actual: control.actual,
    expected,
  })
})
