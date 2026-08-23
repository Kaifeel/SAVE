import { ADMIN_STATUS_META } from '../../admin/presentation.js'

export default function AdminStatusBadge({ status }) {
  const meta = ADMIN_STATUS_META[status] || ADMIN_STATUS_META.PENDING
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  )
}
