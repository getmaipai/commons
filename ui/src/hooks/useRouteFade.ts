import { useEffect, useRef, type RefObject } from "react"
import { useLocation } from "react-router-dom"
import { fadeIn } from "./motion"

/** MOTION-01 fade family: a short opacity fade on the page body when the route changes. The page is never remounted and nothing moves
 *  (opacity only, from 0.35), so there is no layout shift; the first render and a change of query string or hash do not fade. */
export function useRouteFade(ref: RefObject<HTMLElement | null>): void {
  const { pathname } = useLocation()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (last.current !== null && last.current !== pathname && ref.current) fadeIn([ref.current], 0.35)
    last.current = pathname
  }, [pathname, ref])
}
