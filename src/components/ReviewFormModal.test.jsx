import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import ReviewFormModal from './ReviewFormModal'

afterEach(cleanup)

it('requires a star rating and trimmed text before submitting', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  render(<ReviewFormModal
    isOpen
    isSubmitting={false}
    onClose={vi.fn()}
    onSubmit={onSubmit}
  />)

  await user.click(screen.getByRole('button', { name: '후기 제출' }))
  expect(screen.getByRole('alert')).toHaveTextContent('별점과 후기를 모두 입력해주세요.')

  await user.click(screen.getByRole('button', { name: '5점' }))
  await user.type(screen.getByLabelText('텍스트 후기'), '  약속을 잘 지켜줬어요.  ')
  await user.click(screen.getByRole('button', { name: '후기 제출' }))

  expect(onSubmit).toHaveBeenCalledWith({
    rating: 5,
    content: '약속을 잘 지켜줬어요.',
  })
})

it('limits review text to 500 characters and disables actions while submitting', () => {
  render(<ReviewFormModal
    isOpen
    isSubmitting
    onClose={vi.fn()}
    onSubmit={vi.fn()}
  />)

  expect(screen.getByLabelText('텍스트 후기')).toHaveAttribute('maxlength', '500')
  expect(screen.getByRole('button', { name: '후기 제출 중' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '닫기' })).toBeDisabled()
})
