export interface IShelterPerson {
  id: number
  shelterId: number
  nationalId?: string
  name: string
  age?: number
  notes?: string
  verifiedInShelter: boolean
  foundByFamily: boolean
  verifiedAt?: number
  familyFoundAt?: number
  createdAt: number
}

export interface IShelter {
  id: number
  name: string
  city: string
  state?: string
  address: string
  latitude: number
  longitude: number
  contactPhone?: string
  notes?: string
  status: "active" | "closed"
  people: IShelterPerson[]
  createdAt: number
}

export type IShelterDraft = Omit<IShelter, "id" | "people" | "createdAt" | "status">

export type IShelterPersonDraft = Omit<
  IShelterPerson,
  | "id"
  | "shelterId"
  | "verifiedInShelter"
  | "foundByFamily"
  | "verifiedAt"
  | "familyFoundAt"
  | "createdAt"
>
