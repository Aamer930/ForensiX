import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — ForensiX` : 'ForensiX'
    return () => { document.title = 'ForensiX' }
  }, [title])
}
