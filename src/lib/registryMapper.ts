import type { FoundInfo, RegistryDraft, RegistryRecord } from "../types/registry"

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
    contacts: contactsFor(contacts, "centers", row.id),
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
  }
}

export function contactsToInsert(
  contacts: string[],
  ownerType: "persons" | "centers",
  ownerId: number,
) {
  return contacts.map((phone, index) => ({
    person_id: ownerType === "persons" ? ownerId : null,
    center_id: ownerType === "centers" ? ownerId : null,
    phone,
    position: index,
  }))
}
