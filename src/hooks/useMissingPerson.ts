import { useCallback, useEffect, useState } from "react"
import {
  MissingPersonCreate,
  MissingPersonList,
  MissingPersonReopen,
  MissingPersonReportFound,
  SupplyCenterList,
} from "../Services/MissingPersonService"
import type {
  IFoundInfo,
  IMissingPerson,
  IMissingPersonDraft,
} from "../Interfaces/IMissingPerson"
import type { SupplyCenter } from "../types/registry"

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export const useMissingPerson = () => {
  const [persons, setPersons] = useState<IMissingPerson[]>([])
  const [centers, setCenters] = useState<SupplyCenter[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [registerOpen, setRegisterOpen] = useState(false)
  const [foundDialogPerson, setFoundDialogPerson] = useState<IMissingPerson | null>(null)

  const fetchPersons = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [personsData, centersData] = await Promise.all([
        MissingPersonList(),
        SupplyCenterList(),
      ])
      setPersons(personsData)
      setCenters(centersData)
    } catch (err) {
      const message = errorMessage(err, "No se pudo cargar la información.")
      setError(message)
      window.alert(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPersons()
  }, [fetchPersons])

  const handleNew = useCallback(() => setRegisterOpen(true), [])
  const handleCloseRegister = useCallback(() => setRegisterOpen(false), [])

  const handleSave = useCallback(
    async (draft: IMissingPersonDraft, photoFile: File | null) => {
      try {
        await MissingPersonCreate(draft, photoFile)
        setRegisterOpen(false)
        await fetchPersons()
      } catch (err) {
        const message = errorMessage(err, "No se pudo guardar el registro.")
        window.alert(message)
        throw err
      }
    },
    [fetchPersons],
  )

  const handleReportFound = useCallback(
    (person: IMissingPerson) => setFoundDialogPerson(person),
    [],
  )
  const handleCloseFound = useCallback(() => setFoundDialogPerson(null), [])

  const handleConfirmFound = useCallback(
    async (foundInfo: IFoundInfo) => {
      if (!foundDialogPerson) return
      try {
        await MissingPersonReportFound(foundDialogPerson.id, foundInfo)
        setFoundDialogPerson(null)
        await fetchPersons()
      } catch (err) {
        const message = errorMessage(err, "No se pudo reportar el cambio.")
        window.alert(message)
        throw err
      }
    },
    [foundDialogPerson, fetchPersons],
  )

  const handleReopen = useCallback(
    async (id: number) => {
      try {
        await MissingPersonReopen(id)
        await fetchPersons()
      } catch (err) {
        window.alert(errorMessage(err, "No se pudo revertir el reporte."))
      }
    },
    [fetchPersons],
  )

  return {
    persons,
    centers,
    loading,
    error,
    registerOpen,
    foundDialogPerson,
    handleNew,
    handleCloseRegister,
    handleSave,
    handleReportFound,
    handleCloseFound,
    handleConfirmFound,
    handleReopen,
  }
}

export type MissingPersonState = ReturnType<typeof useMissingPerson>
