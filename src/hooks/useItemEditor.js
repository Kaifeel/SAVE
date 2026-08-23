import { useState } from 'react'
import { Camera, PenTool } from 'lucide-react'
import { toCreateItemPayload } from '../api/normalizers.js'

export function useItemEditor({
  apiEnabled,
  itemData,
  pickupLocations,
  university,
  setItems,
  setSelectedItem,
  toast,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingItemId, setEditingItemId] = useState(null)
  const [type, setType] = useState('rent')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [priceType, setPriceType] = useState('일')
  const [pickupLocationId, setPickupLocationId] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState([])

  const reset = () => {
    setType('rent')
    setTitle('')
    setPrice('')
    setPriceType('일')
    setPickupLocationId('')
    setDescription('')
    setPhotos([])
    setEditingItemId(null)
  }

  const close = () => {
    reset()
    setIsOpen(false)
  }

  const openCreate = () => {
    reset()
    setIsOpen(true)
  }

  const openEdit = item => {
    setEditingItemId(item.id)
    setTitle(item.title)
    setPrice(String(item.price))
    setPriceType(item.priceType)
    setPickupLocationId(item.pickupLocationId || '')
    setType(item.type)
    setDescription(item.description)
    setPhotos([])
    setSelectedItem(null)
    setIsOpen(true)
  }

  const selectPhotos = event => {
    const selectedFiles = Array.from(event.target.files || [])
    if (selectedFiles.length === 0) return

    setPhotos(current => [...current, ...selectedFiles].slice(0, 5))
    event.target.value = ''
  }

  const removePhoto = index => {
    setPhotos(current => current.filter((_, photoIndex) => photoIndex !== index))
  }

  const submit = async event => {
    event.preventDefault()
    if (!title || !price) return

    setIsSubmitting(true)
    const wasEditing = Boolean(editingItemId)
    const ItemIcon = type === 'want' ? PenTool : Camera
    const iconColor = type === 'want'
      ? 'text-blue-500 bg-blue-50'
      : 'text-rose-500 bg-rose-50'
    const newItem = {
      id: Date.now(),
      title,
      price: parseInt(price, 10) || 0,
      priceType,
      location: pickupLocations.find(location => location.id === pickupLocationId)?.name || '캠퍼스 내',
      badge: '신규',
      section: 'recent',
      type,
      university,
      rating: 5.0,
      reviews: 0,
      owner: '나 (학생인증완료)',
      description: description || '설명이 작성되지 않았습니다.',
      imageIcon: ItemIcon,
      iconColor,
      status: 'available',
      createdAt: new Date().toISOString(),
      photos: photos.map(file => ({ name: file.name, size: file.size })),
    }

    try {
      if (apiEnabled) {
        const payload = toCreateItemPayload({
          title,
          price,
          priceType,
          pickupLocationId,
          type,
          description,
          photos,
        })
        if (editingItemId) {
          const updated = await itemData.update(editingItemId, payload)
          setSelectedItem(updated)
        } else {
          await itemData.create(payload)
        }
      } else {
        setItems(current => [newItem, ...current])
      }

      reset()
      setIsOpen(false)
      toast.success(wasEditing ? '물품이 수정되었습니다.' : '물품이 성공적으로 등록되었습니다.')
    } catch (error) {
      toast.error(error.message || '물품 등록에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    isOpen,
    isSubmitting,
    editingItemId,
    fields: {
      type,
      title,
      price,
      priceType,
      pickupLocationId,
      description,
      photos,
    },
    setters: {
      setType,
      setTitle,
      setPrice,
      setPriceType,
      setPickupLocationId,
      setDescription,
    },
    openCreate,
    openEdit,
    close,
    selectPhotos,
    removePhoto,
    submit,
  }
}
