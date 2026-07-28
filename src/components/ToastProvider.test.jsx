import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from './ToastProvider'
import { useToast } from './toast'

function Harness() {
  const toast = useToast()
  return (
    <>
      <button onClick={() => toast.success('저장되었습니다.')}>success</button>
      <button onClick={() => toast.error('저장하지 못했습니다.')}>error</button>
    </>
  )
}

describe('ToastProvider', () => {
  it('renders success and error feedback without blocking the page', async () => {
    const user = userEvent.setup()
    render(<ToastProvider><Harness /></ToastProvider>)

    await user.click(screen.getByRole('button', { name: 'success' }))
    await user.click(screen.getByRole('button', { name: 'error' }))

    expect(screen.getByText('저장되었습니다.')).toBeVisible()
    expect(screen.getByText('저장하지 못했습니다.')).toBeVisible()
  })
})
