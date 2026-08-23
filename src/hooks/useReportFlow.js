import { useState } from 'react'
import { createReport } from '../api/reports.js'

export function useReportFlow({ accessToken, apiEnabled, toast }) {
  const [target, setTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const open = nextTarget => {
    setTarget(nextTarget)
    setReason('')
  }

  const close = () => {
    if (isSubmitting) return
    setTarget(null)
    setReason('')
  }

  const submit = async event => {
    event.preventDefault()
    const trimmedReason = reason.trim()
    if (!target || trimmedReason.length < 10 || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (apiEnabled) {
        await createReport({
          reported_user_id: target.ownerId,
          item_id: target.id,
          reason: trimmedReason,
        }, accessToken)
      }
      setTarget(null)
      setReason('')
      toast.success('신고가 접수되었습니다.')
    } catch (error) {
      toast.error(error.message || '신고 접수에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    target,
    reason,
    setReason,
    isSubmitting,
    open,
    close,
    submit,
  }
}
