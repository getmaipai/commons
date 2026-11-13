import { useRef } from "react"

/** MOTION-01 list family: the keys that arrived after the first render of a live list. Give an item the `motion-list` class only when
 *  its key is in the returned set, so a list that mounts full does not animate every row, and a row that is added does. A flagged key
 *  stays flagged (the class does nothing once its animation has played), so a re-render never cuts the animation short. */
export function useInsertedKeys(keys: readonly string[]): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null)
  const inserted = useRef<Set<string>>(new Set())
  if (seen.current === null) seen.current = new Set(keys)
  else
    for (const key of keys)
      if (!seen.current.has(key)) {
        seen.current.add(key)
        inserted.current.add(key)
      }
  return inserted.current
}
