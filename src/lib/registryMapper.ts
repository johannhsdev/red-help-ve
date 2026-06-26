import type {
  AffectedSite,
  AffectedSiteDraft,
  FoundInfo,
  HospitalCenter,
  HospitalCenterDraft,
  HospitalPatient,
  HospitalPatientDraft,
  RegistryDraft,
  RegistryRecord,
} from "../types/registry"

export interface PersonRow {
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

export interface SupplyCenterRow {
  id: number
  name: string | null
  photo_url: string | null
  organization: string | null
  location: string | null
  needs: string | null
  schedule: string | null
  latitude: number | null
  longitude: number | null
  created_at: string
}

export interface AffectedSiteRow {
  id: number
  name: string | null
  photo_url: string | null
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  families_count: number | null
  people_count: number | null
  needs: string | null
  urgency: "low" | "medium" | "high" | "critical" | string | null
  contact_name: string | null
  contact_phone: string | null
  status: "active" | "helped" | "closed" | string | null
  created_at: string
}

export interface ContactRow {
  id: number
  person_id: number | null
  center_id: number | null
  phone: string | null
  position: number | null
}

export interface FoundReportRow {
  id: number
  person_id: number | null
  location_type: "family" | "registered_center" | "external_center" | string | null
  center_id: number | null
  external_center_name: string | null
  external_center_location: string | null
  created_at: string
}

export interface HospitalCenterRow {
  id: number
  name: string | null
  city: string | null
  state: string | null
  address: string | null
  contact_phone: string | null
  notes: string | null
  status: "active" | "closed" | string | null
  created_at: string
}

export interface HospitalPatientRow {
  id: number
  hospital_center_id: number | null
  national_id: string | null
  name: string | null
  age: number | null
  notes: string | null
  verified_in_hospital: boolean | null
  found_by_family: boolean | null
  verified_at: string | null
  family_found_at: string | null
  created_at: string
}

export function contactsFor(
  contacts: ContactRow[],
  ownerType: "persons" | "centers",
  ownerId: number,
) {
  return contacts
    .filter((contact) =>
      ownerType === "persons" ? contact.person_id === ownerId : contact.center_id === ownerId,
    )
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((contact) => contact.phone?.trim())
    .filter((phone): phone is string => Boolean(phone))
}

export function foundInfoFromReport(report: FoundReportRow | undefined): FoundInfo | undefined {
  if (!report) return undefined
  if (report.location_type === "family") return { kind: "family" }
  if (report.location_type === "registered_center" && report.center_id) {
    return {
      kind: "registered_center",
      centerId: report.center_id,
      centerName: report.external_center_name ?? "Centro de acopio",
    }
  }
  if (report.location_type === "external_center") {
    return {
      kind: "external_center",
      centerName: report.external_center_name ?? "Centro de acopio",
      centerLocation: report.external_center_location ?? undefined,
    }
  }
  return undefined
}

export function personRowToRecord(
  row: PersonRow,
  contacts: ContactRow[],
  foundReport?: FoundReportRow,
): RegistryRecord {
  return {
    id: row.id,
    type: "persons",
    photoUrl: row.photo_url ?? "/placeholder.svg",
    name: row.name ?? "",
    cedula: row.national_id ?? "",
    age: row.age?.toString() ?? "",
    location: row.home_address || row.last_seen_location || "",
    contactName: row.reporter_name ?? "",
    contacts: contactsFor(contacts, "persons", row.id),
    notes: row.last_seen_location || row.notes || undefined,
    status: row.status === "found" ? "found" : "missing",
    foundInfo: foundInfoFromReport(foundReport),
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function centerRowToRecord(row: SupplyCenterRow, contacts: ContactRow[]): RegistryRecord {
  return {
    id: row.id,
    type: "centers",
    photoUrl: row.photo_url ?? "/placeholder.svg",
    name: row.name ?? "",
    organization: row.organization ?? undefined,
    location: row.location ?? "",
    needs: row.needs ?? "",
    schedule: row.schedule ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    contacts: contactsFor(contacts, "centers", row.id),
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function affectedSiteRowToRecord(row: AffectedSiteRow): AffectedSite {
  return {
    id: row.id,
    photoUrl: row.photo_url ?? "/placeholder.svg",
    name: row.name ?? "",
    description: row.description ?? undefined,
    address: row.address ?? "",
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
    familiesCount: row.families_count ?? undefined,
    peopleCount: row.people_count ?? undefined,
    needs: row.needs ?? "",
    urgency:
      row.urgency === "low" ||
      row.urgency === "high" ||
      row.urgency === "critical"
        ? row.urgency
        : "medium",
    contactName: row.contact_name ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    status:
      row.status === "helped" || row.status === "closed"
        ? row.status
        : "active",
    createdAt: new Date(row.created_at).getTime(),
  }
}

function optionalTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : undefined
}

export function hospitalPatientRowToRecord(row: HospitalPatientRow): HospitalPatient {
  return {
    id: row.id,
    hospitalCenterId: row.hospital_center_id ?? 0,
    nationalId: row.national_id ?? "",
    name: row.name ?? "",
    age: row.age ?? undefined,
    notes: row.notes ?? undefined,
    verifiedInHospital: Boolean(row.verified_in_hospital),
    foundByFamily: Boolean(row.found_by_family),
    verifiedAt: optionalTimestamp(row.verified_at),
    familyFoundAt: optionalTimestamp(row.family_found_at),
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function hospitalCenterRowToRecord(
  row: HospitalCenterRow,
  patients: HospitalPatientRow[],
): HospitalCenter {
  const centerPatients = patients
    .filter((patient) => patient.hospital_center_id === row.id)
    .map(hospitalPatientRowToRecord)
    .sort((a, b) => b.createdAt - a.createdAt)

  return {
    id: row.id,
    name: row.name ?? "",
    city: row.city ?? "",
    state: row.state ?? undefined,
    address: row.address ?? "",
    contactPhone: row.contact_phone ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status === "closed" ? "closed" : "active",
    patients: centerPatients,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function draftToPersonInsert(draft: Extract<RegistryDraft, { type: "persons" }>, photoUrl: string) {
  return {
    name: draft.name,
    photo_url: photoUrl,
    national_id: draft.cedula || null,
    age: draft.age ? Number(draft.age) : null,
    last_seen_location: draft.notes ?? draft.location,
    reporter_name: draft.contactName,
    notes: draft.notes ?? null,
    status: draft.status,
    home_address: draft.location,
  }
}

export function draftToCenterInsert(draft: Extract<RegistryDraft, { type: "centers" }>, photoUrl: string) {
  return {
    name: draft.name,
    photo_url: photoUrl,
    organization: draft.organization ?? null,
    location: draft.location,
    needs: draft.needs,
    schedule: draft.schedule ?? null,
    latitude: draft.latitude ?? null,
    longitude: draft.longitude ?? null,
  }
}

export function draftToAffectedSiteInsert(draft: AffectedSiteDraft, photoUrl: string) {
  return {
    name: draft.name,
    photo_url: photoUrl,
    description: draft.description ?? null,
    address: draft.address,
    latitude: draft.latitude,
    longitude: draft.longitude,
    families_count: draft.familiesCount ?? null,
    people_count: draft.peopleCount ?? null,
    needs: draft.needs,
    urgency: draft.urgency,
    contact_name: draft.contactName ?? null,
    contact_phone: draft.contactPhone ?? null,
    status: "active",
  }
}

export function draftToHospitalCenterInsert(draft: HospitalCenterDraft) {
  return {
    name: draft.name,
    city: draft.city,
    state: draft.state ?? null,
    address: draft.address,
    contact_phone: draft.contactPhone ?? null,
    notes: draft.notes ?? null,
    status: "active",
  }
}

export function draftToHospitalPatientRpc(draft: HospitalPatientDraft, hospitalCenterId: number) {
  return {
    p_hospital_center_id: hospitalCenterId,
    p_national_id: draft.nationalId,
    p_name: draft.name,
    p_age: draft.age ?? null,
    p_notes: draft.notes ?? null,
  }
}

export function contactsToInsert(
  contacts: string[],
  ownerType: "persons" | "centers",
  ownerId: number,
) {
  return contacts
    .map((phone) => phone.trim())
    .filter(Boolean)
    .map((phone, index) => ({
      person_id: ownerType === "persons" ? ownerId : null,
      center_id: ownerType === "centers" ? ownerId : null,
      phone,
      position: index,
    }))
}
