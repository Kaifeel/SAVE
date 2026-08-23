import { describe, expect, it } from 'vitest'
import * as runtime from './runtime'

const { parseApiMode } = runtime

describe('parseApiMode', () => {
  it('accepts only explicit runtime modes', () => {
    expect(parseApiMode('mock')).toBe('mock')
    expect(parseApiMode('development')).toBe('development')
    expect(parseApiMode('production')).toBe('production')
    expect(() => parseApiMode('true')).toThrow('VITE_API_MODE')
  })

  it('defaults to development when no mode is configured', () => {
    expect(parseApiMode()).toBe('development')
  })
})

describe('isAutoLoginEnabled', () => {
  it('allows sample auto-login only in mock mode', () => {
    expect(runtime.isAutoLoginEnabled(false, 'true')).toBe(true)
    expect(runtime.isAutoLoginEnabled(true, 'true')).toBe(false)
    expect(runtime.isAutoLoginEnabled(false, 'false')).toBe(false)
  })
})
