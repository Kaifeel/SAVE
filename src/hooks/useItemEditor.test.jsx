import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useItemEditor } from './useItemEditor.js'

function setup(overrides = {}) {
  const itemData = {
    create: vi.fn().mockResolvedValue({ id: 10 }),
    update: vi.fn().mockResolvedValue({ id: 3, title: '수정됨' }),
  }
  const options = {
    useApi: true,
    itemData,
    setItems: vi.fn(),
    pickupLocations: [{ id: 4, name: '누리관' }],
    university: '부경대학교',
    onClose: vi.fn(),
    onSelectedItem: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  }
  return { ...renderHook(() => useItemEditor(options)), itemData, options }
}

beforeEach(() => vi.clearAllMocks())

describe('useItemEditor', () => {
  it('선택 사진을 다섯 개로 제한하고 원하는 사진을 제거한다', () => {
    const { result } = setup()
    const files = Array.from({ length: 6 }, (_, index) => new File(['x'], `${index}.png`))
    const input = { files, value: 'selected' }

    act(() => result.current.handlePhotoSelect({ target: input }))
    expect(result.current.newPhotos.map(file => file.name)).toEqual([
      '0.png', '1.png', '2.png', '3.png', '4.png',
    ])
    expect(input.value).toBe('')

    act(() => result.current.handlePhotoRemove(1))
    expect(result.current.newPhotos.map(file => file.name)).toEqual([
      '0.png', '2.png', '3.png', '4.png',
    ])
  })

  it('기존 물품을 열어 수정 payload를 제출하고 폼을 초기화한다', async () => {
    const { result, itemData, options } = setup()
    act(() => result.current.openEdit({
      id: 3,
      title: '우산',
      price: 1000,
      priceType: '일',
      pickupLocationId: 4,
      type: 'rent',
      description: '튼튼합니다',
    }))

    await act(async () => result.current.submit({ preventDefault: vi.fn() }))

    expect(itemData.update).toHaveBeenCalledWith(3, expect.objectContaining({
      title: '우산',
      rental_fee: 1000,
      rental_unit: 'DAY',
      pickup_location_id: 4,
      type: 'LEND',
      description: '튼튼합니다',
    }))
    expect(options.onSelectedItem).toHaveBeenCalledWith({ id: 3, title: '수정됨' })
    expect(options.onSuccess).toHaveBeenCalledWith('물품이 수정되었습니다.')
    expect(result.current.editingItemId).toBeNull()
    expect(result.current.newTitle).toBe('')
  })

  it('제출 실패 시 오류를 전달하고 입력값을 보존한다', async () => {
    const error = new Error('저장 실패')
    const { result, itemData, options } = setup()
    itemData.create.mockRejectedValue(error)
    act(() => {
      result.current.setNewTitle('충전기')
      result.current.setNewPrice('500')
    })

    await act(async () => result.current.submit({ preventDefault: vi.fn() }))

    expect(options.onError).toHaveBeenCalledWith(error)
    expect(options.onClose).not.toHaveBeenCalled()
    expect(result.current.newTitle).toBe('충전기')
    expect(result.current.isSubmittingItem).toBe(false)
  })
})
