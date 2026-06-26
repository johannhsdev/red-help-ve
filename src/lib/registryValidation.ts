import type { AffectedSiteDraft, RegistryDraft } from "../types/registry"

const PHONE_RE = /^\+?[0-9\s().-]{7,24}$/
const CEDULA_RE = /^[VEJPGvejpg]?-?[0-9.]{5,14}$/
const MAX_IMAGE_SIZE = 40 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

function clean(value: string, max: number) {
  return value.trim().replace(/\s+/g, " ").slice(0, max)
}

function cleanOptional(value: string | undefined, max: number) {
  const next = clean(value ?? "", max)
  return next || undefined
}

function validateContacts(contacts: string[], required = true) {
  const cleaned = contacts.map((c) => clean(c, 24)).filter(Boolean)
  if (required && cleaned.length === 0) {
    throw new Error("Agrega al menos un numero de contacto.")
  }
  if (cleaned.length > 5) {
    throw new Error("Puedes agregar maximo 5 contactos.")
  }
  if (cleaned.some((c) => !PHONE_RE.test(c))) {
    throw new Error("Revisa el formato de los numeros de contacto.")
  }
  return cleaned
}

export function validateImageFile(file: File | null) {
  if (!file) {
    throw new Error("Por favor sube una foto.")
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("La foto debe ser JPG, PNG o WEBP.")
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("La foto no debe superar 40 MB.")
  }
}

export function validateRegistryDraft(draft: RegistryDraft): RegistryDraft {
  const contacts = validateContacts(draft.contacts, draft.type === "persons")
  const base = {
    ...draft,
    name: clean(draft.name, 120),
    location: clean(draft.location, 180),
    contacts,
  }

  if (!base.name) throw new Error("Indica el nombre.")
  if (!base.location) throw new Error("Indica la ubicacion.")

  if (draft.type === "persons") {
    const cedula = clean(draft.cedula, 20)
    const age = clean(draft.age, 3)
    const contactName = clean(draft.contactName, 120)

    if (cedula && !CEDULA_RE.test(cedula)) throw new Error("Revisa el formato de la cedula.")
    if (age && (!/^[0-9]{1,3}$/.test(age) || Number(age) > 120)) {
      throw new Error("Indica una edad valida.")
    }
    if (!contactName) throw new Error("Indica el familiar o contacto responsable.")

    return {
      ...base,
      type: "persons",
      cedula,
      age,
      contactName,
      notes: cleanOptional(draft.notes, 400),
      status: "missing",
    }
  }

  const needs = clean(draft.needs, 500)
  if (!needs) throw new Error("Indica como se puede colaborar.")
  if (!Number.isFinite(draft.latitude) || !Number.isFinite(draft.longitude)) {
    throw new Error("Marca la ubicacion del centro en el mapa.")
  }
  if (
    draft.latitude === undefined ||
    draft.longitude === undefined ||
    draft.latitude < -90 ||
    draft.latitude > 90 ||
    draft.longitude < -180 ||
    draft.longitude > 180
  ) {
    throw new Error("La ubicacion marcada no es valida.")
  }

  return {
    ...base,
    type: "centers",
    organization: cleanOptional(draft.organization, 120),
    needs,
    schedule: cleanOptional(draft.schedule, 120),
    latitude: draft.latitude,
    longitude: draft.longitude,
  }
}

function cleanOptionalNumber(value: number | undefined, max: number) {
  if (value === undefined || Number.isNaN(value)) return undefined
  const next = Math.trunc(value)
  if (next < 0 || next > max) return undefined
  return next
}

export function validateAffectedSiteDraft(draft: AffectedSiteDraft): AffectedSiteDraft {
  const name = clean(draft.name, 120)
  const address = clean(draft.address, 180)
  const needs = clean(draft.needs, 500)
  const description = cleanOptional(draft.description, 700)
  const contactName = cleanOptional(draft.contactName, 120)
  const contactPhone = cleanOptional(draft.contactPhone, 24)
  const familiesCount = cleanOptionalNumber(draft.familiesCount, 10000)
  const peopleCount = cleanOptionalNumber(draft.peopleCount, 100000)

  if (!name) throw new Error("Indica el nombre del lugar afectado.")
  if (!address) throw new Error("Indica la direccion o referencia del lugar.")
  if (!needs) throw new Error("Indica que ayuda se necesita.")
  if (!Number.isFinite(draft.latitude) || !Number.isFinite(draft.longitude)) {
    throw new Error("Marca la ubicacion en el mapa.")
  }
  if (draft.latitude < -90 || draft.latitude > 90 || draft.longitude < -180 || draft.longitude > 180) {
    throw new Error("La ubicacion marcada no es valida.")
  }
  if (contactPhone && !PHONE_RE.test(contactPhone)) {
    throw new Error("Revisa el formato del numero de contacto.")
  }

  return {
    name,
    description,
    address,
    latitude: draft.latitude,
    longitude: draft.longitude,
    familiesCount,
    peopleCount,
    needs,
    urgency: draft.urgency,
    contactName,
    contactPhone,
  }
}
