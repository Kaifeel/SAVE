import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './toast'
let nextToastId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback(id => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const show = useCallback((type, message) => {
    const id = nextToastId
    nextToastId += 1
    setToasts(current => [...current, { id, type, message }])
    return id
  }, [])

  const value = useMemo(() => ({
    success: message => show('success', message),
    error: message => show('error', message),
    dismiss,
  }), [dismiss, show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-white'
            }`}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              className="text-xs opacity-80 hover:opacity-100"
              aria-label="알림 닫기"
              onClick={() => dismiss(toast.id)}
            >
              닫기
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
