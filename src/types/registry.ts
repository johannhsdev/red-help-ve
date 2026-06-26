export type RecordType = "persons" | "centers"
export type AffectedSiteUrgency = "low" | "medium" | "high" | "critical"
export type AffectedSiteStatus = "active" | "helped" | "closed"

export interface BaseRecord {
  id: number
  type: RecordType
  photoUrl: string
  name: string
  location: string
  contacts: string[]
  createdAt: number
}

export type PersonStatus = "missing" | "found"

export type FoundInfo =
  | { kind: "family" }
  | { kind: "registered_center"; centerId: number; centerName: string }
  | { kind: "external_center"; centerName: string; centerLocation?: string }

export interface MissingPerson extends BaseRecord {
  type: "persons"
  cedula: string
  age: string
  contactName: string
  notes?: string
  status: PersonStatus
  foundInfo?: FoundInfo
}

export interface SupplyCenter extends BaseRecord {
  type: "centers"
  organization?: string
  needs: string
  schedule?: string
  latitude?: number
  longitude?: number
}

export type RegistryRecord = MissingPerson | SupplyCenter

export type RegistryDraft =
  | Omit<MissingPerson, "id" | "photoUrl" | "createdAt">
  | Omit<SupplyCenter, "id" | "photoUrl" | "createdAt">

export interface AffectedSite {
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
  urgency: AffectedSiteUrgency
  contactName?: string
  contactPhone?: string
  status: AffectedSiteStatus
  createdAt: number
}

export type AffectedSiteDraft = Omit<AffectedSite, "id" | "photoUrl" | "createdAt" | "status">
