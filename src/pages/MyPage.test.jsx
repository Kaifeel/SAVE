import { cleanup, render, screen } from '@testing-library/react'
import { Camera } from 'lucide-react'
import { afterEach, expect, it, vi } from 'vitest'
import MyPage from './MyPage'

afterEach(cleanup)

const labels = {
  available: '대여 가능',
  request_pending: '요청 확인 중',
  reserved: '대여 예약',
  rented: '대여 중',
}

it.each(Object.entries(labels))('renders %s from the item status, not its array index', (status, label) => {
  render(<MyPage
    memberName="테스트"
    memberDepartment="컴퓨터공학과"
    popularItems={[]}
    recommendItems={[]}
    setSelectedItem={vi.fn()}
    onLogout={vi.fn()}
    onOpenRentals={vi.fn()}
    data={{
      profile: { data: {}, loading: false, error: null },
      items: { data: [{
        id: 1,
        title: `${status} 물품`,
        price: 0,
        priceType: '일',
        status,
        imageIcon: Camera,
        iconColor: 'bg-slate-100',
      }], loading: false, error: null },
      wishlist: { data: [], loading: false, error: null },
    }}
  />)

  expect(screen.getByText(label)).toBeInTheDocument()
})

it('uses a neutral label instead of inventing a member name and disables unfinished settings', () => {
  render(<MyPage
    memberName=""
    memberDepartment=""
    popularItems={[]}
    recommendItems={[]}
    setSelectedItem={vi.fn()}
    onLogout={vi.fn()}
    onOpenRentals={vi.fn()}
    data={{
      profile: { data: null, loading: false, error: null },
      items: { data: [], loading: false, error: null },
      wishlist: { data: [], loading: false, error: null },
    }}
  />)

  expect(screen.getByRole('heading', { name: '사용자' })).toBeInTheDocument()
  expect(screen.queryByText('김부경')).not.toBeInTheDocument()
  expect(screen.queryByText('컴퓨터공학과')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '알림 설정' })).toBeDisabled()
})
