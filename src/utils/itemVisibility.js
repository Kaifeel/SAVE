export function availableItems(items = []) {
  return items.filter(item => item.status === 'available')
}
