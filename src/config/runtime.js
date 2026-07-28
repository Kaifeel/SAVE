const API_MODES = new Set(['mock', 'development', 'production'])

export function parseApiMode(value) {
  const mode = value || 'development'
  if (!API_MODES.has(mode)) {
    throw new Error(
      `VITE_API_MODE must be mock, development, or production; received ${mode}`,
    )
  }
  return mode
}

export const API_MODE = parseApiMode(import.meta.env.VITE_API_MODE)
export const USE_API = API_MODE !== 'mock'
