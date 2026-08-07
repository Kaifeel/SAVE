import { Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ReviewFormModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [rating, setRating] = useState(0)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setRating(0)
    setContent('')
    setError('')
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async event => {
    event.preventDefault()
    const trimmedContent = content.trim()
    if (!rating || !trimmedContent) {
      setError('별점과 후기를 모두 입력해주세요.')
      return
    }
    setError('')
    await onSubmit({ rating, content: trimmedContent })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-form-title"
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 id="review-form-title" className="text-lg font-black text-slate-900">거래 후기 작성</h2>
          <button
            type="button"
            aria-label="닫기"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-5" onSubmit={handleSubmit}>
          <fieldset>
            <legend className="text-sm font-bold text-slate-700">별점</legend>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value}점`}
                  aria-pressed={rating === value}
                  disabled={isSubmitting}
                  onClick={() => setRating(value)}
                  className="rounded-lg p-1 disabled:opacity-40"
                >
                  <Star className={`h-8 w-8 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          </fieldset>

          <label htmlFor="review-content" className="mt-5 block text-sm font-bold text-slate-700">
            텍스트 후기
          </label>
          <textarea
            id="review-content"
            value={content}
            maxLength={500}
            disabled={isSubmitting}
            onChange={event => setContent(event.target.value)}
            className="mt-2 h-32 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-100"
            placeholder="거래 상대방과의 경험을 작성해주세요."
          />
          <div className="mt-1 text-right text-xs text-slate-400">{content.length}/500</div>
          {error && <p role="alert" className="mt-2 text-xs font-bold text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:bg-slate-300"
          >
            {isSubmitting ? '후기 제출 중' : '후기 제출'}
          </button>
        </form>
      </section>
    </div>
  )
}
