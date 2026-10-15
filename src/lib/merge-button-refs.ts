/*
    This function merges multiple refs into a single ref callback.
    It ensures that the value is assigned to each ref, whether it's a function or a mutable ref object.
    This is useful when you need to merge external refs with an internal ref.
    It returns a cleanup (React 19), which runs the refs' own cleanups, or
    calls them with null if they have none.
*/

export function mergeButtonRefs<T extends HTMLButtonElement>(
  refs: Array<React.Ref<T> | React.LegacyRef<T> | undefined>
): React.RefCallback<T> {
  return (value) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(value)
        return typeof cleanup === "function" ? cleanup : () => ref(null)
      }
      if (ref != null && typeof ref === "object") {
        ;(ref as React.RefObject<T | null>).current = value
        return () => {
          ;(ref as React.RefObject<T | null>).current = null
        }
      }
      return undefined
    })
    return () => cleanups.forEach((cleanup) => cleanup?.())
  }
}
