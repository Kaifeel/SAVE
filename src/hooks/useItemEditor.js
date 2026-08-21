import { useCallback, useState } from 'react'
import { Camera, PenTool } from 'lucide-react'
import { toCreateItemPayload } from '../api/normalizers.js'

export function useItemEditor({
  useApi,
  itemData,
  setItems,
  pickupLocations,
  university,
  onClose,
  onSelectedItem,
  onSuccess,
  onError,
}) {
  const [isSubmittingItem, setIsSubmittingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newPriceType, setNewPriceType] = useState('일')
  const [newPickupLocationId, setNewPickupLocationId] = useState('')
  const [newType, setNewType] = useState('rent')
  const [newDescription, setNewDescription] = useState('')
  const [newPhotos, setNewPhotos] = useState([])

  const reset = useCallback(() => {
    setNewTitle('')
    setNewPrice('')
    setNewPickupLocationId('')
    setNewDescription('')
    setNewPhotos([])
    setEditingItemId(null)
  }, [])

  const openCreate = useCallback(() => {
    reset()
  }, [reset])

  const openEdit = useCallback(item => {
    setEditingItemId(item.id)
    setNewTitle(item.title)
    setNewPrice(String(item.price))
    setNewPriceType(item.priceType)
    setNewPickupLocationId(item.pickupLocationId || '')
    setNewType(item.type)
    setNewDescription(item.description)
    setNewPhotos([])
  }, [])

  const handlePhotoSelect = useCallback(event => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return
    setNewPhotos(current => [...current, ...selectedFiles].slice(0, 5))
    event.target.value = ''
  }, [])

  const handlePhotoRemove = useCallback(index => {
    setNewPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))
  }, [])

  const submit = useCallback(async event => {
    event.preventDefault()
    if (!newTitle || !newPrice || isSubmittingItem) return
    setIsSubmittingItem(true)
    const wasEditing = Boolean(editingItemId)

    try {
      if (useApi) {
        const payload = toCreateItemPayload({
          title: newTitle,
          price: newPrice,
          priceType: newPriceType,
          pickupLocationId: newPickupLocationId,
          type: newType,
          description: newDescription,
          photos: newPhotos,
        })
        if (editingItemId) {
          const updated = await itemData.update(editingItemId, payload)
          onSelectedItem?.(updated)
        } else {
          await itemData.create(payload)
        }
      } else {
        const SelectedIcon = newType === 'want' ? PenTool : Camera
        const colorClasses = newType === 'want'
          ? 'text-blue-500 bg-blue-50'
          : 'text-rose-500 bg-rose-50'
        const newItem = {
          id: Date.now(),
          title: newTitle,
          price: parseInt(newPrice, 10) || 0,
          priceType: newPriceType,
          location: pickupLocations.find(location => location.id === newPickupLocationId)?.name || '캠퍼스 내',
          badge: '신규',
          section: 'recent',
          type: newType,
          university,
          rating: 5.0,
          reviews: 0,
          owner: '나 (학생인증완료)',
          description: newDescription || '설명이 작성되지 않았습니다.',
          imageIcon: SelectedIcon,
          iconColor: colorClasses,
          status: 'available',
          createdAt: new Date().toISOString(),
          photos: newPhotos.map(file => ({ name: file.name, size: file.size })),
        }
        setItems(current => [newItem, ...current])
      }

      reset()
      onClose?.()
      onSuccess?.(wasEditing ? '물품이 수정되었습니다.' : '물품이 성공적으로 등록되었습니다.')
    } catch (error) {
      onError?.(error)
    } finally {
      setIsSubmittingItem(false)
    }
  }, [
    editingItemId,
    isSubmittingItem,
    itemData,
    newDescription,
    newPhotos,
    newPickupLocationId,
    newPrice,
    newPriceType,
    newTitle,
    newType,
    onClose,
    onError,
    onSelectedItem,
    onSuccess,
    pickupLocations,
    reset,
    setItems,
    university,
    useApi,
  ])

  return {
    isSubmittingItem,
    editingItemId,
    newTitle,
    setNewTitle,
    newPrice,
    setNewPrice,
    newPriceType,
    setNewPriceType,
    newPickupLocationId,
    setNewPickupLocationId,
    newType,
    setNewType,
    newDescription,
    setNewDescription,
    newPhotos,
    openCreate,
    openEdit,
    handlePhotoSelect,
    handlePhotoRemove,
    submit,
    reset,
  }
}
