/**
 * Production-safe logging utility
 * 
 * Only logs when:
 * - NODE_ENV is 'development'
 * - NEXT_PUBLIC_DEV_MODE is 'true'
 * 
 * Usage:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('ComponentName')
 *   log('message', data)
 */

const IS_DEV = process.env.NODE_ENV === 'development' || 
               process.env.NEXT_PUBLIC_DEV_MODE === 'true'

/**
 * Create a namespaced logger that only logs in development
 * @param namespace - Prefix for log messages (e.g., 'TailorPage', 'api/job/fetch')
 * @returns A logging function that only outputs in development
 */
export function createLogger(namespace: string) {
  return (...args: unknown[]) => {
    if (IS_DEV) {
      console.log(`[${namespace}]`, ...args)
    }
  }
}

/**
 * Create a verbose logger for detailed debugging (only in dev mode)
 * @param namespace - Prefix for log messages
 * @returns A logging function for verbose output
 */
export function createVerboseLogger(namespace: string) {
  return (...args: unknown[]) => {
    if (IS_DEV && process.env.NEXT_PUBLIC_DEV_MODE === 'true') {
      console.log(`[${namespace}:VERBOSE]`, ...args)
    }
  }
}

/**
 * Log errors - these always log in production for debugging critical issues
 * but are sanitized to avoid leaking sensitive data
 */
export function logError(namespace: string, message: string, error?: unknown) {
  const errorInfo = error instanceof Error 
    ? { name: error.name, message: error.message }
    : { message: String(error) }
  
  console.error(`[${namespace}] ERROR:`, message, errorInfo)
}

/**
 * Log warnings - these always log but are sanitized
 */
export function logWarn(namespace: string, message: string, data?: unknown) {
  if (IS_DEV) {
    console.warn(`[${namespace}] WARN:`, message, data)
  } else {
    // In production, only log the message without potentially sensitive data
    console.warn(`[${namespace}] WARN:`, message)
  }
}
