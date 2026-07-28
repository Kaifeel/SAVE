import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import RentalRequestForm from './RentalRequestForm'

it('rejects an end time that is not after the start time', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<RentalRequestForm
    item={{ id: 1, price: 1000, priceType: '일' }}
    chatRoomId={3}
    onSubmit={onSubmit}
  />)

  await user.type(screen.getByLabelText('시작일'), '2026-08-03T10:00')
  await user.type(screen.getByLabelText('종료일'), '2026-08-02T10:00')
  await user.click(screen.getByRole('button', { name: '대여 요청' }))

  expect(screen.getByRole('alert')).toHaveTextContent('종료일은 시작일 이후여야 합니다.')
  expect(onSubmit).not.toHaveBeenCalled()
})
