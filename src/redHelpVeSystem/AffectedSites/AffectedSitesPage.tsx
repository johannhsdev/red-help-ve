import { useAffectedSites } from "../../hooks/useAffectedSites"
import { AffectedSiteList } from "./components/AffectedSiteList"

export function AffectedSitesPage() {
  const { sites, loaded, error, addSite } = useAffectedSites()

  return (
    <AffectedSiteList
      sites={sites}
      loaded={loaded}
      error={error}
      onAdd={addSite}
    />
  )
}
