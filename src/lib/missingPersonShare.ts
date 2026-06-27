import type { MissingPerson } from "../types/registry"

const PLATFORM_URL = "https://red-help-ve.vercel.app/"
const SHARE_PHOTO_SIZE = 1080

type ShareResult = "native" | "whatsapp" | "cancelled"

function cleanText(value: string | undefined) {
  return value?.trim() ?? ""
}

function personDetails(person: MissingPerson) {
  const age = cleanText(person.age)
  const lastSeen = cleanText(person.notes)
  const location = cleanText(person.location)
  const contactName = cleanText(person.contactName)
  const contacts = person.contacts.map((contact) => contact.trim()).filter(Boolean)

  return { age, lastSeen, location, contactName, contacts }
}

function personStatusLabel(person: MissingPerson) {
  return person.status === "found" ? "Encontrada" : "Desaparecida"
}

function personStatusEmoji(person: MissingPerson) {
  return person.status === "found" ? "🟢" : "🔴"
}

function personStatusColor(person: MissingPerson) {
  return person.status === "found" ? "#16a34a" : "#dc2626"
}

function personShareTitle(person: MissingPerson) {
  return person.status === "found" ? "Persona encontrada" : "Persona desaparecida"
}

export function missingPersonShareMessage(person: MissingPerson) {
  const { age, lastSeen, location, contactName, contacts } = personDetails(person)
  const statusLabel = personStatusLabel(person)
  const lines: Array<string | null> = [
    personShareTitle(person),
    "",
    `Nombre: ${person.name}`,
    `${personStatusEmoji(person)} Estatus: ${statusLabel}`,
    age ? `Edad: ${age} años` : null,
    location ? `Vive en: ${location}` : null,
    lastSeen ? `Última vez visto/a: ${lastSeen}` : null,
    contactName ? `Familiar o contacto: ${contactName}` : null,
    "",
    contacts.length > 0
      ? ["Si tienes información sobre su paradero, puedes comunicarte a:", ...contacts.map((contact) => `- ${contact}`)].join("\n")
      : "No hay teléfonos de contacto registrados. Puedes notificar información en la plataforma.",
    "",
    "También puede notificar su paradero en esta plataforma:",
    PLATFORM_URL,
    "",
    "Por favor comparte esta información.",
  ]

  return lines.filter((line): line is string => line !== null).join("\n")
}

function whatsappShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("No se pudo cargar la foto para compartir."))
    image.src = src
  })
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = image.width / image.height
  const targetRatio = width / height
  const sourceWidth = imageRatio > targetRatio ? image.height * targetRatio : image.width
  const sourceHeight = imageRatio > targetRatio ? image.height : image.width / targetRatio
  const sourceX = (image.width - sourceWidth) / 2
  const sourceY = (image.height - sourceHeight) / 2

  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height)
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function drawStatusBadge(ctx: CanvasRenderingContext2D, person: MissingPerson) {
  const label = personStatusLabel(person).toUpperCase()
  const x = 40
  const y = 40
  const height = 74
  const paddingX = 28

  ctx.font = "900 34px Inter, Arial, sans-serif"
  const width = Math.ceil(ctx.measureText(label).width + paddingX * 2)

  roundedRect(ctx, x, y, width, height, 18)
  ctx.fillStyle = personStatusColor(person)
  ctx.fill()

  ctx.fillStyle = "#ffffff"
  ctx.fillText(label, x + paddingX, y + 48)
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
        return
      }
      reject(new Error("No se pudo crear la imagen para compartir."))
    }, "image/png")
  })
}

async function createMissingPersonSharePhoto(person: MissingPerson) {
  const canvas = document.createElement("canvas")
  canvas.width = SHARE_PHOTO_SIZE
  canvas.height = SHARE_PHOTO_SIZE

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("El navegador no permite preparar la foto.")

  const image = await loadImage(person.photoUrl || "/placeholder.svg")

  ctx.fillStyle = "#0f172a"
  ctx.fillRect(0, 0, SHARE_PHOTO_SIZE, SHARE_PHOTO_SIZE)
  drawCoverImage(ctx, image, 0, 0, SHARE_PHOTO_SIZE, SHARE_PHOTO_SIZE)
  drawStatusBadge(ctx, person)

  const blob = await canvasToBlob(canvas)
  return new File([blob], `desaparecido-${person.id}.png`, { type: "image/png" })
}

function canShareFiles(files: File[]) {
  if (!navigator.share) return false
  if (!navigator.canShare) return true
  return navigator.canShare({ files })
}

async function copyShareText(message: string) {
  try {
    await navigator.clipboard?.writeText(message)
  } catch (error) {
    console.warn(error)
  }
}

export async function shareMissingPerson(person: MissingPerson): Promise<ShareResult> {
  const message = missingPersonShareMessage(person)
  const title = `${personShareTitle(person)}: ${person.name}`

  try {
    const file = await createMissingPersonSharePhoto(person)
    if (canShareFiles([file])) {
      await copyShareText(message)
      await navigator.share({
        title,
        text: message,
        files: [file],
      })
      return "native"
    }
  } catch (error) {
    console.warn(error)
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title,
        text: message,
      })
      return "native"
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    }
  }

  window.location.href = whatsappShareUrl(message)
  return "whatsapp"
}
