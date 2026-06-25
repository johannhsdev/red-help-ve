import { useCallback, useEffect, useState } from "react"
import type { FoundInfo, RegistryDraft, RegistryRecord } from "../types/registry"
import {
  centerRowToRecord,
  contactsToInsert,
  draftToCenterInsert,
  draftToPersonInsert,
  personRowToRecord,
  type ContactRow,
  type FoundReportRow,
  type PersonRow,
  type SupplyCenterRow,
} from "../lib/registryMapper"
import { supabase } from "../lib/supabase"
import { validateImageFile, validateRegistryDraft } from "../lib/registryValidation"

function fileExtension(file: File) {
  const fallback = file.type.split("/")[1] || "jpg"
  return file.name.split(".").pop()?.toLowerCase() || fallback
}

async function uploadPhoto(file: File, type: RegistryDraft["type"]) {
  validateImageFile(file)

  const path = `${crypto.randomUUID()}.${fileExtension(file)}`
  const { error } = await supabase.storage.from(type).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
  })

  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`)

  const { data } = supabase.storage.from(type).getPublicUrl(path)
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

export function useRegistry() {
  const [records, setRecords] = useState<RegistryRecord[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadRecords = useCallback(async () => {
    setLoaded(false)
    setError("")

    const [personsRequest, centersRequest, contactsRequest, reportsRequest] = await Promise.all([
      supabase.from("persons").select("*").order("created_at", { ascending: false }),
      supabase.from("supply_centers").select("*").order("created_at", { ascending: false }),
      supabase.from("contacts").select("*").order("position", { ascending: true }),
      supabase.from("found_reports").select("*").order("created_at", { ascending: false }),
    ])

    const requestError =
      personsRequest.error || centersRequest.error || contactsRequest.error || reportsRequest.error

    if (requestError) {
      setError(requestError.message)
      setRecords([])
      setLoaded(true)
      return
    }

    const contacts = (contactsRequest.data ?? []) as ContactRow[]
    const reportsByPerson = latestFoundReportByPerson((reportsRequest.data ?? []) as FoundReportRow[])
    const persons = ((personsRequest.data ?? []) as PersonRow[]).map((row) =>
      personRowToRecord(row, contacts, reportsByPerson[row.id]),
    )
    const centers = ((centersRequest.data ?? []) as SupplyCenterRow[]).map((row) =>
      centerRowToRecord(row, contacts),
    )

    setRecords([...persons, ...centers].sort((a, b) => b.createdAt - a.createdAt))
    setLoaded(true)
  }, [])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  const addRecord = useCallback(async (draft: RegistryDraft, photoFile: File) => {
    const cleanDraft = validateRegistryDraft(draft)
    const photoUrl = await uploadPhoto(photoFile, cleanDraft.type)

    if (cleanDraft.type === "persons") {
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

      const next = personRowToRecord(person, contactRows as ContactRow[])
      setRecords((current) => [next, ...current])
      return next
    }

    const { data, error: insertError } = await supabase
      .from("supply_centers")
      .insert(draftToCenterInsert(cleanDraft, photoUrl))
      .select("*")
      .single()

    if (insertError) throw new Error(insertError.message)

    const center = data as SupplyCenterRow
    const contactRows = contactsToInsert(cleanDraft.contacts, "centers", center.id)
    const { error: contactsError } = await supabase.from("contacts").insert(contactRows)

    if (contactsError) throw new Error(contactsError.message)

    const next = centerRowToRecord(center, contactRows as ContactRow[])
    setRecords((current) => [next, ...current])
    return next
  }, [])

  const reportFound = useCallback(async (id: number, foundInfo: FoundInfo) => {
    const { error: reportError } = await supabase.rpc("report_person_found", {
      p_person_id: id,
      p_location_type: foundInfo.kind,
      p_center_id: foundInfo.kind === "registered_center" ? foundInfo.centerId : null,
      p_external_center_name: foundInfo.kind === "family" ? null : foundInfo.centerName,
      p_external_center_location:
        foundInfo.kind === "external_center" ? foundInfo.centerLocation ?? null : null,
    })

    if (reportError) throw new Error(reportError.message)

    setRecords((current) =>
      current.map((record) =>
        record.id === id && record.type === "persons"
          ? { ...record, status: "found", foundInfo }
          : record,
      ),
    )
  }, [])

  const reopenPerson = useCallback(async (id: number) => {
    const { error: updateError } = await supabase.rpc("reopen_person", {
      p_person_id: id,
    })

    if (updateError) throw new Error(updateError.message)

    setRecords((current) =>
      current.map((record) =>
        record.id === id && record.type === "persons"
          ? { ...record, status: "missing", foundInfo: undefined }
          : record,
      ),
    )
  }, [])

  return { records, loaded, error, addRecord, reportFound, reopenPerson, refresh: loadRecords }
}

export type RegistryState = ReturnType<typeof useRegistry>
