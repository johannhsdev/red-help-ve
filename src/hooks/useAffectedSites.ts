import { useCallback, useEffect, useState } from "react"
import type { IAffectedSite, IAffectedSiteDraft } from "../Interfaces/IAffectedSite"
import { AffectedSiteList, AffectedSiteCreate } from "../Services/AffectedSiteService"

export function useAffectedSites() {
  const [sites, setSites] = useState<IAffectedSite[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadSites = useCallback(async () => {
    setLoaded(false)
    setError("")
    try {
      const data = await AffectedSiteList()
      setSites(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar zonas afectadas.")
      setSites([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSites()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadSites])

  const addSite = useCallback(async (draft: IAffectedSiteDraft, photoFile: File) => {
    const next = await AffectedSiteCreate(draft, photoFile)
    setSites((current) => [next, ...current])
    return next
  }, [])

  return { sites, loaded, error, addSite, refresh: loadSites }
}

export type AffectedSitesState = ReturnType<typeof useAffectedSites>
