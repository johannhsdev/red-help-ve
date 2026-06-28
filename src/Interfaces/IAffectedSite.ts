export type IAffectedSiteUrgency = "low" | "medium" | "high" | "critical"
export type IAffectedSiteStatus = "active" | "helped" | "closed"

export interface IAffectedSite {
  id: number
  photoUrl: string
  name: string
  description?: string
  address: string
  latitude: number
  longitude: number
  familiesCount?: number
  peopleCount?: number
  needs: string
  urgency: IAffectedSiteUrgency
  contactName?: string
  contactPhone?: string
  status: IAffectedSiteStatus
  createdAt: number
}

export type IAffectedSiteDraft = Omit<IAffectedSite, "id" | "photoUrl" | "createdAt" | "status">
