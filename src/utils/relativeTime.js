const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function formatRelativeTime(value, now = Date.now()) {
  if (!value) return ''

  const createdAt = new Date(value).getTime()
  if (Number.isNaN(createdAt)) return ''

  const elapsed = Math.max(0, now - createdAt)
  if (elapsed < MINUTE) return '방금 전'
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`
  return `${Math.floor(elapsed / DAY)}일 전`
}
