'use client'

import { useCallback, useEffect, RefObject } from 'react'

/**
 * Auto-resize a textarea to fit its content
 */
export function autoResize(element: HTMLTextAreaElement | null) {
  if (!element) return
  // Reset height to auto to get the correct scrollHeight
  element.style.height = 'auto'
  // Set to scrollHeight to fit content
  element.style.height = `${element.scrollHeight}px`
}

/**
 * Hook to auto-resize a textarea on value change
 */
export function useAutoResize(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    autoResize(ref.current)
  }, [ref, value])
}

/**
 * Event handler that auto-resizes on input
 */
export function handleAutoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
  autoResize(e.target)
}

/**
 * Combined onChange handler that includes auto-resize
 * Named as a hook since it uses useCallback internally
 */
export function useAutoResizeHandler(
  onChange: (value: string) => void
) {
  return useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    autoResize(e.target)
    onChange(e.target.value)
  }, [onChange])
}
