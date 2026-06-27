import { supabase } from "../lib/supabase"
import {
  centerRowToRecord,
  contactsToInsert,
  draftToPersonInsert,
  personRowToRecord,
  type ContactRow,
  type FoundReportRow,
  type PersonRow,
  type SupplyCenterRow,
} from "../lib/registryMapper"
import { validateImageFile, validateRegistryDraft } from "../lib/registryValidation"
import type {
  IFoundInfo,
  IMissingPerson,
  IMissingPersonDraft,
} from "../Interfaces/IMissingPerson"
import type { SupplyCenter } from "../types/registry"

function fileExtension(file: File) {
  const fallback = file.type.split("/")[1] || "jpg"
  return file.name.split(".").pop()?.toLowerCase() || fallback
}

async function uploadPhoto(file: File): Promise<string> {
  validateImageFile(file)

  const path = `${crypto.randomUUID()}.${fileExtension(file)}`
  const { error } = await supabase.storage.from("persons").upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`)

  const { data } = supabase.storage.from("persons").getPublicUrl(path)
  return data.publicUrl
}

function latestFoundReportByPerson(reports: FoundReportRow[]) {
  return reports.reduce<Record<number, FoundReportRow>>((acc, report) => {
    if (!report.person_id) return acc
    const current = acc[report.person_id]
    if (!current || new Date(report.created_at) > new Date(current.created_at)) {
      acc[report.person_id] = report
    }
    return acc
  }, {})
}

export const MissingPersonList = async (): Promise<IMissingPerson[]> => {
  const [personsRequest, contactsRequest, reportsRequest] = await Promise.all([
    supabase.from("persons").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").order("position", { ascending: true }),
    supabase.from("found_reports").select("*").order("created_at", { ascending: false }),
  ])

  const requestError =
    personsRequest.error || contactsRequest.error || reportsRequest.error

  if (requestError) throw new Error(requestError.message)

  const contacts = (contactsRequest.data ?? []) as ContactRow[]
  const reportsByPerson = latestFoundReportByPerson(
    (reportsRequest.data ?? []) as FoundReportRow[],
  )

  return ((personsRequest.data ?? []) as PersonRow[]).map(
    (row) => personRowToRecord(row, contacts, reportsByPerson[row.id]) as IMissingPerson,
  )
}

export const MissingPersonCreate = async (
  draft: IMissingPersonDraft,
  photoFile: File | null,
): Promise<IMissingPerson> => {
  if (!photoFile) throw new Error("Por favor sube una foto.")

  const cleanDraft = validateRegistryDraft({
    type: "persons",
    name: draft.name,
    location: draft.location,
    contacts: draft.contacts,
    cedula: draft.cedula,
    age: draft.age,
    contactName: draft.contactName,
    notes: draft.notes,
    status: "missing",
  })

  if (cleanDraft.type !== "persons") throw new Error("Registro inválido.")

  const photoUrl = await uploadPhoto(photoFile)

  const { data, error: insertError } = await supabase
    .from("persons")
    .insert(draftToPersonInsert(cleanDraft, photoUrl))
    .select("*")
    .single()

  if (insertError) throw new Error(insertError.message)

  const person = data as PersonRow
  const contactRows = contactsToInsert(cleanDraft.contacts, "persons", person.id)
  const { error: contactsError } = await supabase.from("contacts").insert(contactRows)

  if (contactsError) throw new Error(contactsError.message)

  return personRowToRecord(person, contactRows as ContactRow[]) as IMissingPerson
}

export const MissingPersonReportFound = async (
  id: number,
  foundInfo: IFoundInfo,
): Promise<void> => {
  const { error } = await supabase.rpc("report_person_found", {
    p_person_id: id,
    p_location_type: foundInfo.kind,
    p_center_id: foundInfo.kind === "registered_center" ? foundInfo.centerId : null,
    p_external_center_name: foundInfo.kind === "family" ? null : foundInfo.centerName,
    p_external_center_location:
      foundInfo.kind === "external_center" ? foundInfo.centerLocation ?? null : null,
  })

  if (error) throw new Error(error.message)
}

export const MissingPersonReopen = async (id: number): Promise<void> => {
  const { error } = await supabase.rpc("reopen_person", { p_person_id: id })

  if (error) throw new Error(error.message)
}

export const SupplyCenterList = async (): Promise<SupplyCenter[]> => {
  const [centersRequest, contactsRequest] = await Promise.all([
    supabase.from("supply_centers").select("*").order("created_at", { ascending: false }),
    supabase.from("contacts").select("*").order("position", { ascending: true }),
  ])

  if (centersRequest.error) throw new Error(centersRequest.error.message)
  if (contactsRequest.error) throw new Error(contactsRequest.error.message)

  const contacts = (contactsRequest.data ?? []) as ContactRow[]
  return ((centersRequest.data ?? []) as SupplyCenterRow[]).map((row) =>
    centerRowToRecord(row, contacts) as SupplyCenter,
  )
}
