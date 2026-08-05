import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import ItemRegistrationModal from './ItemRegistrationModal'

afterEach(cleanup)

const baseProps = {
  isOpen: true,
  setIsWriteModalOpen: vi.fn(),
  handleCreateItem: vi.fn(event => event.preventDefault()),
  newType: 'rent',
  setNewType: vi.fn(),
  newPhotos: [],
  handlePhotoSelect: vi.fn(),
  handlePhotoRemove: vi.fn(),
  newTitle: '우산',
  setNewTitle: vi.fn(),
  newPrice: '1000',
  setNewPrice: vi.fn(),
  newPriceType: '일',
  setNewPriceType: vi.fn(),
  newPickupLocationId: '',
  setNewPickupLocationId: vi.fn(),
  pickupLocations: [{ id: 3, name: '누리관 앞' }],
  newDescription: '',
  setNewDescription: vi.fn(),
  isSubmittingItem: false,
}

it('stores a pickup-location id instead of a location string', async () => {
  const user = userEvent.setup()
  const setNewPickupLocationId = vi.fn()
  render(<ItemRegistrationModal
    {...baseProps}
    setNewPickupLocationId={setNewPickupLocationId}
  />)

  await user.selectOptions(screen.getByLabelText('거래 선호 위치'), '3')

  expect(setNewPickupLocationId).toHaveBeenCalledWith(3)
})

it('does not offer free as a rental period unit', () => {
  render(<ItemRegistrationModal {...baseProps} />)

  expect(screen.queryByRole('option', { name: '무료' })).not.toBeInTheDocument()
})
