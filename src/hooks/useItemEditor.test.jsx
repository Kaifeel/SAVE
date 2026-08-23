import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useItemEditor } from './useItemEditor.js'

function setup(overrides = {}) {
  const itemData = {
    create: vi.fn().mockResolvedValue({ id: 9 }),
    update: vi.fn().mockResolvedValue({ id: 7, title: '수정됨' }),
  }
  const dependencies = {
    apiEnabled: false,
    itemData,
    pickupLocations: [{ id: 3, name: '누리관 앞' }],
    university: '부경대학교',
    setItems: vi.fn(),
    setSelectedItem: vi.fn(),
    toast: { success: vi.fn(), error: vi.fn() },
    ...overrides,
  }
  return {
    ...renderHook(() => useItemEditor(dependencies)),
    dependencies,
  }
}

describe('useItemEditor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps an existing item into editable fields', () => {
    const { result, dependencies } = setup()

    act(() => result.current.openEdit({
      id: 7,
      type: 'want',
      title: '공학용 계산기',
      price: 800,
      priceType: '시간',
      pickupLocationId: 3,
      description: '시험 때 필요합니다.',
    }))

    expect(result.current.isOpen).toBe(true)
    expect(result.current.editingItemId).toBe(7)
    expect(result.current.fields).toEqual({
      type: 'want',
      title: '공학용 계산기',
      price: '800',
      priceType: '시간',
      pickupLocationId: 3,
      description: '시험 때 필요합니다.',
      photos: [],
    })
    expect(dependencies.setSelectedItem).toHaveBeenCalledWith(null)
  })

  it('resets every field when an edit is closed', () => {
    const { result } = setup()
    act(() => result.current.openEdit({
      id: 7,
      type: 'want',
      title: '계산기',
      price: 800,
      priceType: '시간',
      pickupLocationId: 3,
      description: '설명',
    }))

    act(() => result.current.close())

    expect(result.current.isOpen).toBe(false)
    expect(result.current.editingItemId).toBe(null)
    expect(result.current.fields).toEqual({
      type: 'rent',
      title: '',
      price: '',
      priceType: '일',
      pickupLocationId: '',
      description: '',
      photos: [],
    })
  })

  it('keeps at most five selected photos and clears the file input', () => {
    const { result } = setup()
    const event = {
      target: {
        files: Array.from({ length: 6 }, (_, index) => ({ name: `${index}.png` })),
        value: 'selected',
      },
    }

    act(() => result.current.selectPhotos(event))

    expect(result.current.fields.photos.map(photo => photo.name)).toEqual([
      '0.png', '1.png', '2.png', '3.png', '4.png',
    ])
    expect(event.target.value).toBe('')
  })

  it('creates an API item and closes after a successful submission', async () => {
    const { result, dependencies } = setup({ apiEnabled: true })
    act(() => {
      result.current.openCreate()
      result.current.setters.setTitle('우산')
      result.current.setters.setPrice('1000')
      result.current.setters.setPickupLocationId(3)
    })

    await act(() => result.current.submit({ preventDefault: vi.fn() }))

    expect(dependencies.itemData.create).toHaveBeenCalledWith({
      title: '우산',
      rental_fee: 1000,
      rental_unit: 'DAY',
      pickup_location_id: 3,
      type: 'LEND',
      description: '',
      precautions: '',
      photos: [],
    })
    expect(result.current.isOpen).toBe(false)
    expect(dependencies.toast.success).toHaveBeenCalledWith('물품이 성공적으로 등록되었습니다.')
  })
})
