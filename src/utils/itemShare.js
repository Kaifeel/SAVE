export function buildItemShareUrl(itemId, locationObject = globalThis.location) {
  if (itemId === undefined || itemId === null || String(itemId).trim() === '') {
    throw new Error('공유할 게시글 정보가 없습니다.')
  }

  const url = new URL(locationObject.href)
  url.searchParams.set('item', String(itemId))
  url.hash = ''
  return url.toString()
}

export function getSharedItemId(locationObject = globalThis.location) {
  const value = new URL(locationObject.href).searchParams.get('item')
  if (!value || !/^\d+$/.test(value) || Number(value) <= 0) return null
  return Number(value)
}

export function clearSharedItemId({
  locationObject = globalThis.location,
  historyObject = globalThis.history,
} = {}) {
  const url = new URL(locationObject.href)
  if (!url.searchParams.has('item')) return
  url.searchParams.delete('item')
  historyObject.replaceState(historyObject.state, '', `${url.pathname}${url.search}${url.hash}`)
}

export async function shareItem(item, navigatorObject = globalThis.navigator) {
  const url = buildItemShareUrl(item?.id)
  const shareData = {
    title: item?.title || 'SAVE 대여 게시글',
    text: item?.title ? `${item.title} 게시글을 확인해 보세요.` : '대여 게시글을 확인해 보세요.',
    url,
  }

  if (typeof navigatorObject?.share === 'function') {
    try {
      await navigatorObject.share(shareData)
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'canceled'
    }
  }

  if (typeof navigatorObject?.clipboard?.writeText === 'function') {
    await navigatorObject.clipboard.writeText(url)
    return 'copied'
  }

  throw new Error('이 브라우저에서는 공유 또는 링크 복사를 지원하지 않습니다.')
}
