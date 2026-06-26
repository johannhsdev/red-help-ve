import { useCallback, useEffect, useState } from "react"
import type { HospitalCenter, HospitalCenterDraft, HospitalPatient, HospitalPatientDraft } from "../types/registry"
import {
  draftToHospitalCenterInsert,
  draftToHospitalPatientRpc,
  hospitalCenterRowToRecord,
  hospitalPatientRowToRecord,
  type HospitalCenterRow,
  type HospitalPatientRow,
} from "../lib/registryMapper"
import { supabase } from "../lib/supabase"
import { validateHospitalCenterDraft, validateHospitalPatientDraft } from "../lib/registryValidation"

function sortCenters(centers: HospitalCenter[]) {
  return [...centers].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
}

function sortPatients(patients: HospitalPatient[]) {
  return [...patients].sort((a, b) => b.createdAt - a.createdAt)
}

export function useHospitalCenters() {
  const [centers, setCenters] = useState<HospitalCenter[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadCenters = useCallback(async () => {
    setLoaded(false)
    setError("")

    const [centersRequest, patientsRequest] = await Promise.all([
      supabase.from("hospital_centers").select("*").order("city", { ascending: true }),
      supabase.from("hospital_patients").select("*").order("created_at", { ascending: false }),
    ])

    const requestError = centersRequest.error || patientsRequest.error
    if (requestError) {
      setError(requestError.message)
      setCenters([])
      setLoaded(true)
      return
    }

    const patients = (patientsRequest.data ?? []) as HospitalPatientRow[]
    const nextCenters = ((centersRequest.data ?? []) as HospitalCenterRow[]).map((row) =>
      hospitalCenterRowToRecord(row, patients),
    )

    setCenters(sortCenters(nextCenters))
    setLoaded(true)
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCenters()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadCenters])

  const addCenter = useCallback(async (draft: HospitalCenterDraft) => {
    const cleanDraft = validateHospitalCenterDraft(draft)
    const { data, error: insertError } = await supabase
      .from("hospital_centers")
      .insert(draftToHospitalCenterInsert(cleanDraft))
      .select("*")
      .single()

    if (insertError) throw new Error(insertError.message)

    const next = hospitalCenterRowToRecord(data as HospitalCenterRow, [])
    setCenters((current) => sortCenters([next, ...current]))
    return next
  }, [])

  const addPatient = useCallback(async (hospitalCenterId: number, draft: HospitalPatientDraft) => {
    const cleanDraft = validateHospitalPatientDraft(draft)
    const { data, error: insertError } = await supabase.rpc(
      "add_hospital_patient",
      draftToHospitalPatientRpc(cleanDraft, hospitalCenterId),
    )

    if (insertError) throw new Error(insertError.message)

    const next = hospitalPatientRowToRecord(data as HospitalPatientRow)
    setCenters((current) =>
      current.map((center) =>
        center.id === hospitalCenterId
          ? { ...center, patients: sortPatients([next, ...center.patients]) }
          : center,
      ),
    )
    return next
  }, [])

  const updatePatientVerification = useCallback(
    async (
      patientId: number,
      verification: { verifiedInHospital?: boolean; foundByFamily?: boolean },
    ) => {
      const { data, error: updateError } = await supabase.rpc("update_hospital_patient_verification", {
        p_patient_id: patientId,
        p_verified_in_hospital: verification.verifiedInHospital ?? null,
        p_found_by_family: verification.foundByFamily ?? null,
      })

      if (updateError) throw new Error(updateError.message)

      const next = hospitalPatientRowToRecord(data as HospitalPatientRow)
      setCenters((current) =>
        current.map((center) =>
          center.id === next.hospitalCenterId
            ? {
                ...center,
                patients: sortPatients(
                  center.patients.map((patient) => (patient.id === next.id ? next : patient)),
                ),
              }
            : center,
        ),
      )
      return next
    },
    [],
  )

  return { centers, loaded, error, addCenter, addPatient, updatePatientVerification, refresh: loadCenters }
}

export type HospitalCentersState = ReturnType<typeof useHospitalCenters>
