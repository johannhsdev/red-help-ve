export type RecordType = "persons" | "centers"

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
}

export type RegistryRecord = MissingPerson | SupplyCenter

export type RegistryDraft =
  | Omit<MissingPerson, "id" | "photoUrl" | "createdAt">
  | Omit<SupplyCenter, "id" | "photoUrl" | "createdAt">
