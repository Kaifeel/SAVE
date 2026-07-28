import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import SearchPage from './SearchPage'

it('shows an item API error and retries without mock items', async () => {
  const user = userEvent.setup()
  const onRetry = vi.fn()
  render(<SearchPage
    activeBoard="lend"
    setActiveBoard={vi.fn()}
    searchQuery=""
    setSearchQuery={vi.fn()}
    availableOnly={false}
    setAvailableOnly={vi.fn()}
    filteredItems={[]}
    setSelectedItem={vi.fn()}
    loading={false}
    error={new Error('물품을 불러오지 못했습니다.')}
    onRetry={onRetry}
  />)

  expect(screen.getByRole('alert')).toHaveTextContent('물품을 불러오지 못했습니다.')
  await user.click(screen.getByRole('button', { name: '다시 시도' }))
  expect(onRetry).toHaveBeenCalledTimes(1)
  expect(screen.queryByText('등록된 물품이 없습니다.')).not.toBeInTheDocument()
})
