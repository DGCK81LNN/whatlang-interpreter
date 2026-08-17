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
        `Trying to splice at index ${rest[0]} from the Stack, but it only contains ${this.length} items`,
      )
    return super.splice(start, ...rest)
  }
}
