import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import ItemPhoto from './ItemPhoto.jsx'

afterEach(cleanup)

it('shows an item photo when one is available', () => {
  render(
    <ItemPhoto
      item={{ title: '우산', photos: ['https://cdn.example/umbrella.png'] }}
      alt="우산 사진"
      fallback={<span>사진 없음</span>}
    />,
  )

  expect(screen.getByRole('img', { name: '우산 사진' }))
    .toHaveAttribute('src', 'https://cdn.example/umbrella.png')
})

it('falls back to the existing icon when the image cannot load', () => {
  const { container } = render(
    <ItemPhoto
      item={{ photos: ['https://cdn.example/broken.png'] }}
      fallback={<span>기본 아이콘</span>}
    />,
  )

  fireEvent.error(container.querySelector('img'))

  expect(screen.getByText('기본 아이콘')).toBeInTheDocument()
  expect(container.querySelector('img')).toBeNull()
})
