import { useCallback, useEffect, useState } from "react"
import type { IHospitalCenter, IHospitalCenterDraft, IHospitalPatient, IHospitalPatientDraft } from "../Interfaces/IHospitalCenter"
import {
  HospitalCenterList,
  HospitalCenterCreate,
  HospitalPatientCreate,
  HospitalPatientUpdateVerification,
} from "../Services/HospitalCenterService"

function sortCenters(centers: IHospitalCenter[]) {
  return [...centers].sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name))
}

function sortPatients(patients: IHospitalPatient[]) {
  return [...patients].sort((a, b) => b.createdAt - a.createdAt)
}

export function useHospitalCenters() {
  const [centers, setCenters] = useState<IHospitalCenter[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const loadCenters = useCallback(async () => {
    setLoaded(false)
    setError("")
    try {
      const data = await HospitalCenterList()
      setCenters(sortCenters(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar centros hospitalarios.")
      setCenters([])
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCenters()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadCenters])

  const addCenter = useCallback(async (draft: IHospitalCenterDraft) => {
    const next = await HospitalCenterCreate(draft)
    setCenters((current) => sortCenters([next, ...current]))
    return next
  }, [])

  const addPatient = useCallback(async (hospitalCenterId: number, draft: IHospitalPatientDraft) => {
    const next = await HospitalPatientCreate(hospitalCenterId, draft)
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
      const next = await HospitalPatientUpdateVerification(patientId, verification)
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
