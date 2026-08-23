import ChatPage from '../pages/ChatPage.jsx'
import HomePage from '../pages/HomePage.jsx'
import MyPage from '../pages/MyPage.jsx'
import RentalsPage from '../pages/RentalsPage.jsx'
import SearchPage from '../pages/SearchPage.jsx'

export default function ActivePage({
  activeTab,
  homeProps,
  searchProps,
  chatProps,
  myProps,
  rentalProps,
}) {
  if (activeTab === 'home') return <HomePage {...homeProps} />
  if (activeTab === 'search') return <SearchPage {...searchProps} />
  if (activeTab === 'chat') return <ChatPage {...chatProps} />
  if (activeTab === 'my') return <MyPage {...myProps} />
  if (activeTab === 'rentals') return <RentalsPage {...rentalProps} />
  return null
}
