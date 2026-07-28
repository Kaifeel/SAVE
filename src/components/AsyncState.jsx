export default function AsyncState({
  loading,
  error,
  empty,
  onRetry,
  emptyMessage = '표시할 항목이 없습니다.',
  children,
}) {
  if (loading) {
    return (
      <div role="status" className="p-6 text-center text-sm text-slate-500">
        불러오는 중...
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="p-6 text-center">
        <p className="text-sm text-rose-600">{error.message || '정보를 불러오지 못했습니다.'}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            다시 시도
          </button>
        )}
      </div>
    )
  }

  if (empty) {
    return <div className="p-6 text-center text-sm text-slate-500">{emptyMessage}</div>
  }

  return children
}
