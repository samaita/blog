import { useEffect, useRef, useState } from "react"

const DEFAULT_HEIGHT = 600

export function useIframeAutoHeight(fallbackHeight = DEFAULT_HEIGHT) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(fallbackHeight)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const measure = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc) return
        const scrollHeight = Math.max(
          doc.body?.scrollHeight ?? 0,
          doc.documentElement?.scrollHeight ?? 0,
        )
        if (scrollHeight > 0) setHeight(scrollHeight)
      } catch {
        // cross-origin iframe: keep the fallback height
      }
    }

    let observer: ResizeObserver | undefined

    const observeContent = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc?.body) return
        observer?.disconnect()
        observer = new ResizeObserver(measure)
        observer.observe(doc.body)
      } catch {
        // cross-origin iframe: keep the fallback height
      }
    }

    iframe.addEventListener("load", measure)
    window.addEventListener("resize", measure)
    measure()
    observeContent()

    return () => {
      iframe.removeEventListener("load", measure)
      window.removeEventListener("resize", measure)
      observer?.disconnect()
    }
  }, [])

  return { iframeRef, height }
}
