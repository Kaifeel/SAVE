import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import ReportModal from './ReportModal.jsx'

afterEach(cleanup)

const item = {
  id: 7,
  title: '공학용 계산기',
  owner: '김민수',
}

function ReportModalHarness({ onClose = vi.fn(), onSubmit = vi.fn() }) {
  const [reason, setReason] = useState('')

  return (
    <ReportModal
      isOpen
      item={item}
      reason={reason}
      setReason={setReason}
      isSubmitting={false}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  )
}

it('requires a report reason of at least 10 non-whitespace characters', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn(event => event.preventDefault())
  render(<ReportModalHarness onSubmit={onSubmit} />)

  const reasonInput = screen.getByLabelText('신고 사유')
  const submitButton = screen.getByRole('button', { name: '신고 접수' })

  expect(screen.getByText('공학용 계산기')).toBeInTheDocument()
  expect(screen.getByText('작성자 김민수')).toBeInTheDocument()
  expect(submitButton).toBeDisabled()

  await user.type(reasonInput, '문제가있습니다')
  expect(submitButton).toBeDisabled()

  await user.type(reasonInput, ' 상세사유')
  expect(submitButton).toBeEnabled()
  await user.click(submitButton)

  expect(onSubmit).toHaveBeenCalledTimes(1)
})

it('closes without submitting when cancel is selected', async () => {
  const user = userEvent.setup()
  const onClose = vi.fn()
  const onSubmit = vi.fn()
  render(<ReportModalHarness onClose={onClose} onSubmit={onSubmit} />)

  await user.click(screen.getByRole('button', { name: '취소' }))

  expect(onClose).toHaveBeenCalledTimes(1)
  expect(onSubmit).not.toHaveBeenCalled()
})
