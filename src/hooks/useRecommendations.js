import { useCallback, useEffect, useState } from 'react'
import { getMyRecommendationHistory, getRecommendations } from '../api/recommendations'
import { normalizeItemsResponse } from '../api/normalizers'

export function useRecommendations({ accessToken, enabled, department }) {
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled || !department) return
    setError(null)
    try {
      const result = await getRecommendations({
        department,
        interest_items: [],
        time_period: new Date().getHours() < 12 ? '오전' : '오후',
        is_exam_period: false,
        weather_status: '알 수 없음',
      }, accessToken)
      setCurrent({
        ...result,
        items: normalizeItemsResponse(result.recommended_items),
      })
    } catch (requestError) {
      setError(requestError)
    }
  }, [accessToken, department, enabled])

  useEffect(() => {
    if (!enabled) return undefined
    let active = true
    getMyRecommendationHistory(accessToken)
      .then(result => {
        if (active) setHistory(result)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [accessToken, enabled])

  return { current, history, error, refresh }
}
