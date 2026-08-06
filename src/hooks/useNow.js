import { useEffect, useState } from 'react'

export function useNow(refreshInterval = 60_000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let intervalId = null

    const stop = () => {
      if (intervalId !== null) clearInterval(intervalId)
      intervalId = null
    }

    const start = () => {
      if (intervalId === null) {
        intervalId = setInterval(() => setNow(Date.now()), refreshInterval)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now())
        start()
      } else {
        stop()
      }
    }

    handleVisibilityChange()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [refreshInterval])

  return now
}
