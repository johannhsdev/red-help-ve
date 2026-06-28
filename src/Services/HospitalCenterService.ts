import { supabase } from "../lib/supabase"
import { validateHospitalCenterDraft, validateHospitalPatientDraft } from "../lib/registryValidation"
import type { IHospitalCenter, IHospitalCenterDraft, IHospitalPatient, IHospitalPatientDraft } from "../Interfaces/IHospitalCenter"

interface HospitalCenterRow {
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

interface HospitalPatientRow {
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

function optionalTimestamp(value: string | null) {
  return value ? new Date(value).getTime() : undefined
}

function patientRowToRecord(row: HospitalPatientRow): IHospitalPatient {
  return {
    id: row.id,
    hospitalCenterId: row.hospital_center_id ?? 0,
    nationalId: row.national_id ?? undefined,
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

function centerRowToRecord(row: HospitalCenterRow, patients: HospitalPatientRow[]): IHospitalCenter {
  const centerPatients = patients
    .filter((p) => p.hospital_center_id === row.id)
    .map(patientRowToRecord)
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

export async function HospitalCenterList(): Promise<IHospitalCenter[]> {
  const [centersRequest, patientsRequest] = await Promise.all([
    supabase.from("hospital_centers").select("*").order("city", { ascending: true }),
    supabase.from("hospital_patients").select("*").order("created_at", { ascending: false }),
  ])

  if (centersRequest.error) throw new Error(centersRequest.error.message)
  if (patientsRequest.error) throw new Error(patientsRequest.error.message)

  const patients = (patientsRequest.data ?? []) as HospitalPatientRow[]
  return ((centersRequest.data ?? []) as HospitalCenterRow[]).map((row) =>
    centerRowToRecord(row, patients),
  )
}

export async function HospitalCenterCreate(draft: IHospitalCenterDraft): Promise<IHospitalCenter> {
  const cleanDraft = validateHospitalCenterDraft(draft)
  const insert = {
    name: cleanDraft.name,
    city: cleanDraft.city,
    state: cleanDraft.state ?? null,
    address: cleanDraft.address,
    contact_phone: cleanDraft.contactPhone ?? null,
    notes: cleanDraft.notes ?? null,
    status: "active",
  }

  const { data, error } = await supabase
    .from("hospital_centers")
    .insert(insert)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return centerRowToRecord(data as HospitalCenterRow, [])
}

export async function HospitalPatientCreate(
  hospitalCenterId: number,
  draft: IHospitalPatientDraft,
): Promise<IHospitalPatient> {
  const cleanDraft = validateHospitalPatientDraft(draft)
  const { data, error } = await supabase.rpc("add_hospital_patient", {
    p_hospital_center_id: hospitalCenterId,
    p_national_id: cleanDraft.nationalId ?? null,
    p_name: cleanDraft.name,
    p_age: cleanDraft.age ?? null,
    p_notes: cleanDraft.notes ?? null,
  })

  if (error) throw new Error(error.message)
  return patientRowToRecord(data as HospitalPatientRow)
}

export async function HospitalPatientUpdateVerification(
  patientId: number,
  patch: { verifiedInHospital?: boolean; foundByFamily?: boolean },
): Promise<IHospitalPatient> {
  const { data, error } = await supabase.rpc("update_hospital_patient_verification", {
    p_patient_id: patientId,
    p_verified_in_hospital: patch.verifiedInHospital ?? null,
    p_found_by_family: patch.foundByFamily ?? null,
  })

  if (error) throw new Error(error.message)
  return patientRowToRecord(data as HospitalPatientRow)
}
