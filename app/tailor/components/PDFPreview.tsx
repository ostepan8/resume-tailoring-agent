'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

// PDF.js types
declare global {
  interface Window {
    pdfjsLib: {
      GlobalWorkerOptions: { workerSrc: string }
      getDocument: (params: { data: ArrayBuffer }) => {
        promise: Promise<PDFDocument>
      }
    }
  }
}

interface PDFDocument {
  numPages: number
  getPage: (num: number) => Promise<PDFPage>
}

interface PDFPage {
  getViewport: (params: { scale: number }) => { width: number; height: number }
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> }
}

interface PDFPreviewProps {
  url: string | null
  isGenerating: boolean
}

// Load PDF.js from CDN
const loadPdfJs = (): Promise<typeof window.pdfjsLib> => {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      resolve(window.pdfjsLib)
    }
    script.onerror = () => reject(new Error('Failed to load PDF.js'))
    document.head.appendChild(script)
  })
}

// PDF preview using PDF.js canvas rendering
export function PDFPreview({ url, isGenerating }: PDFPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageCount, setPageCount] = useState(0)

  // Track render generation to cancel stale renders
  const renderIdRef = useRef(0)

  // Render PDF to canvas
  const renderPdf = useCallback(async (pdfUrl: string) => {
    if (!containerRef.current) return

    // Increment render ID to cancel any in-flight renders
    const currentRenderId = ++renderIdRef.current

    setLoading(true)
    setError(null)

    // Clear previous canvases
    containerRef.current.innerHTML = ''

    try {
      // Fetch the blob and get ArrayBuffer
      const response = await fetch(pdfUrl)

      // Check if this render is still current
      if (renderIdRef.current !== currentRenderId) return

      const blob = await response.blob()
      const arrayBuffer = await blob.arrayBuffer()

      // Check if this render is still current
      if (renderIdRef.current !== currentRenderId) return

      // Load PDF.js
      const pdfjsLib = await loadPdfJs()

      // Check if this render is still current
      if (renderIdRef.current !== currentRenderId) return

      // Parse PDF
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

      // Check if this render is still current
      if (renderIdRef.current !== currentRenderId) return

      setPageCount(pdf.numPages)

      // Render each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        // Check if this render is still current before each page
        if (renderIdRef.current !== currentRenderId) return

        const page = await pdf.getPage(pageNum)

        // Check again after async operation
        if (renderIdRef.current !== currentRenderId) return

        // Calculate scale to fit container width with padding
        const containerWidth = containerRef.current?.parentElement?.clientWidth || 600
        const desiredWidth = Math.min(containerWidth - 40, 800) // Max 800px, with 40px padding
        const unscaledViewport = page.getViewport({ scale: 1 })
        const scale = desiredWidth / unscaledViewport.width
        const viewport = page.getViewport({ scale })

        // Create canvas for this page
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.display = 'block'
        canvas.style.marginBottom = pageNum < pdf.numPages ? '20px' : '0'
        canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
        canvas.style.borderRadius = '4px'

        const context = canvas.getContext('2d')!
        await page.render({ canvasContext: context, viewport }).promise

        // Final check before appending
        if (renderIdRef.current !== currentRenderId) return

        containerRef.current?.appendChild(canvas)
      }
    } catch (err) {
      // Only set error if this is still the current render
      if (renderIdRef.current === currentRenderId) {
        console.error('PDF render error:', err)
        setError(err instanceof Error ? err.message : 'Failed to render PDF')
      }
    } finally {
      // Only update loading state if this is still the current render
      if (renderIdRef.current === currentRenderId) {
        setLoading(false)
      }
    }
  }, [])

  // Render when URL changes
  useEffect(() => {
    if (url) {
      renderPdf(url)
    }
  }, [url, renderPdf])

  if (!url) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '300px',
          background: 'rgba(0, 0, 0, 0.05)',
          border: '2px dashed rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          color: '#666',
          fontSize: '14px',
        }}
      >
        {isGenerating ? 'Generating preview...' : 'Click "Refresh" to generate preview'}
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Preview container - fills available space */}
      <div
        style={{
          flex: 1,
          background: '#f5f5f5',
          borderRadius: '8px',
          padding: '16px',
          overflow: 'auto',
        }}
      >
        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '300px',
              color: '#666',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  border: '3px solid #ddd',
                  borderTopColor: '#ff5c28',
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  animation: 'spin 1s linear infinite',
                }}
              />
              <span style={{ fontSize: '13px' }}>Rendering PDF...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '300px',
              color: '#c00',
              textAlign: 'center',
            }}
          >
            <p style={{ marginBottom: '8px', fontSize: '14px' }}>Failed to render PDF</p>
            <p style={{ fontSize: '12px', color: '#666' }}>{error}</p>
          </div>
        )}

        {/* Canvas container - pages will be appended here */}
        <div
          ref={containerRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        />
      </div>
    </div>
  )
}

export default PDFPreview
