export type IPersonStatus = "missing" | "found"

export type IFoundInfo =
  | { kind: "family" }
  | { kind: "registered_center"; centerId: number; centerName: string }
  | { kind: "external_center"; centerName: string; centerLocation?: string }

export interface IMissingPerson {
  id: number
  type: "persons"
  photoUrl: string
  name: string
  location: string
  contacts: string[]
  createdAt: number
  cedula: string
  age: string
  contactName: string
  notes?: string
  status: IPersonStatus
  foundInfo?: IFoundInfo
}

export interface IMissingPersonDraft {
  name: string
  location: string
  contacts: string[]
  cedula: string
  age: string
  contactName: string
  notes?: string
}

export interface IPersonRow {
  id: number
  name: string | null
  photo_url: string | null
  national_id: string | null
  age: number | null
  last_seen_location: string | null
  reporter_name: string | null
  notes: string | null
  status: "missing" | "found" | string | null
  home_address: string | null
  created_at: string
}

export interface IContactRow {
  id: number
  person_id: number | null
  center_id: number | null
  phone: string | null
  position: number | null
}

export interface IFoundReportRow {
  id: number
  person_id: number | null
  location_type: "family" | "registered_center" | "external_center" | string | null
  center_id: number | null
  external_center_name: string | null
  external_center_location: string | null
  created_at: string
}
