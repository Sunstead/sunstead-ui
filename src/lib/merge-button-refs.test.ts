import { describe, expect, it, vi } from "vitest"

import { mergeButtonRefs } from "./merge-button-refs"

describe("mergeButtonRefs", () => {
  const button = {} as HTMLButtonElement

  it("hands the element to every ref", () => {
    const object = { current: null as HTMLButtonElement | null }
    const callback = vi.fn()
    mergeButtonRefs([object, callback])(button)
    expect(object.current).toBe(button)
    expect(callback).toHaveBeenCalledWith(button)
  })

  // React 19: a callback ref may return a cleanup, called instead of the
  // ref with null. The merged ref must pass it on.
  it("runs the refs' cleanups, and clears object refs", () => {
    const object = { current: null as HTMLButtonElement | null }
    const cleanup = vi.fn()
    const merged = mergeButtonRefs([object, () => cleanup])
    const done = merged(button)
    expect(typeof done).toBe("function")
    ;(done as () => void)()
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(object.current).toBeNull()
  })

  it("calls a callback ref without a cleanup with null", () => {
    const callback = vi.fn()
    const done = mergeButtonRefs([callback])(button) as () => void
    done()
    expect(callback).toHaveBeenLastCalledWith(null)
  })
})
