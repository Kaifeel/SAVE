import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./config/runtime.js', () => ({
  USE_API: false,
  isAutoLoginEnabled: () => true,
}))

vi.mock('./components/toast.js', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}))

afterEach(cleanup)

it('resets every item form choice after cancel and reopen', () => {
  render(<App />)

  fireEvent.click(screen.getByRole('button', { name: '글쓰기' }))
  fireEvent.click(screen.getByRole('button', { name: '빌려주세요 (요청)' }))
  fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '시간' } })
  fireEvent.click(screen.getByRole('button', { name: '취소' }))
  fireEvent.click(screen.getByRole('button', { name: '글쓰기' }))

  expect(screen.getByRole('button', { name: '빌려줄래요 (제공)' })).toHaveClass('bg-white')
  expect(screen.getByRole('button', { name: '빌려주세요 (요청)' })).not.toHaveClass('bg-white')
  expect(screen.getAllByRole('combobox')[0]).toHaveValue('일')
})
