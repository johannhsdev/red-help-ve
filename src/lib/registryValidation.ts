import type { RegistryDraft } from "../types/registry"

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

function validateContacts(contacts: string[]) {
  const cleaned = contacts.map((c) => clean(c, 24)).filter(Boolean)
  if (cleaned.length === 0) {
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
  const base = {
    ...draft,
    name: clean(draft.name, 120),
    location: clean(draft.location, 180),
    contacts: validateContacts(draft.contacts),
  }

  if (!base.name) throw new Error("Indica el nombre.")
  if (!base.location) throw new Error("Indica la ubicacion.")

  if (draft.type === "persons") {
    const cedula = clean(draft.cedula, 20)
    const age = clean(draft.age, 3)
    const contactName = clean(draft.contactName, 120)

    if (!CEDULA_RE.test(cedula)) throw new Error("Revisa el formato de la cedula.")
    if (!/^[0-9]{1,3}$/.test(age) || Number(age) > 120) {
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

  return {
    ...base,
    type: "centers",
    organization: cleanOptional(draft.organization, 120),
    needs,
    schedule: cleanOptional(draft.schedule, 120),
  }
}
