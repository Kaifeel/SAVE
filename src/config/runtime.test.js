import { describe, expect, it } from 'vitest'
import { parseApiMode } from './runtime'

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
