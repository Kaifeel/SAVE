import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createReport } from '../api/reports.js'
import { useReportFlow } from './useReportFlow.js'

vi.mock('../api/reports.js', () => ({ createReport: vi.fn() }))

const target = { id: 7, ownerId: 9, title: '우산' }

function setup(overrides = {}) {
  const dependencies = {
    accessToken: 'jwt',
    apiEnabled: true,
    toast: { success: vi.fn(), error: vi.fn() },
    ...overrides,
  }
  return {
    ...renderHook(() => useReportFlow(dependencies)),
    dependencies,
  }
}

describe('useReportFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createReport.mockResolvedValue(null)
  })

  it('does not submit a reason shorter than ten trimmed characters', async () => {
    const { result } = setup()
    act(() => {
      result.current.open(target)
      result.current.setReason('  짧은 이유  ')
    })

    await act(() => result.current.submit({ preventDefault: vi.fn() }))

    expect(createReport).not.toHaveBeenCalled()
    expect(result.current.target).toEqual(target)
  })

  it('submits the canonical report payload and resets on success', async () => {
    const { result, dependencies } = setup()
    act(() => {
      result.current.open(target)
      result.current.setReason('  반복적인 허위 게시물입니다.  ')
    })

    await act(() => result.current.submit({ preventDefault: vi.fn() }))

    expect(createReport).toHaveBeenCalledWith({
      reported_user_id: 9,
      item_id: 7,
      reason: '반복적인 허위 게시물입니다.',
    }, 'jwt')
    expect(result.current.target).toBe(null)
    expect(result.current.reason).toBe('')
    expect(dependencies.toast.success).toHaveBeenCalledWith('신고가 접수되었습니다.')
  })

  it('preserves the target and reason after failure so submission can retry', async () => {
    createReport.mockRejectedValue(new Error('report failed'))
    const { result, dependencies } = setup()
    act(() => {
      result.current.open(target)
      result.current.setReason('반복적인 허위 게시물입니다.')
    })

    await act(() => result.current.submit({ preventDefault: vi.fn() }))

    expect(result.current.target).toEqual(target)
    expect(result.current.reason).toBe('반복적인 허위 게시물입니다.')
    expect(dependencies.toast.error).toHaveBeenCalledWith('report failed')
  })

  it('clears report state when explicitly closed', () => {
    const { result } = setup()
    act(() => {
      result.current.open(target)
      result.current.setReason('반복적인 허위 게시물입니다.')
      result.current.close()
    })

    expect(result.current.target).toBe(null)
    expect(result.current.reason).toBe('')
  })
})
