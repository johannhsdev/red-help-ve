import type { EarthquakeEvent, EarthquakeSource } from "../types/earthquake"

const PLATFORM_URL = "https://red-help-ve.vercel.app/"
const SHARE_WIDTH = 1080
const SHARE_HEIGHT = 1080

type ShareResult = "native" | "whatsapp" | "cancelled"

const SOURCE_LABEL: Record<EarthquakeSource, string> = {
  USGS: "USGS",
  GEOFON: "GFZ GEOFON",
  EMSC: "EMSC",
  FUNVISIS: "FUNVISIS",
  SGC: "SGC",
}

const dateFormatter = new Intl.DateTimeFormat("es-VE", {
  dateStyle: "long",
  timeStyle: "short",
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Fecha no disponible"
  return dateFormatter.format(date)
}

function magnitudeColor(magnitude: number) {
  if (magnitude >= 6) return "#ef4444"
  if (magnitude >= 4.5) return "#f97316"
  if (magnitude >= 3) return "#f59e0b"
  return "#38bdf8"
}

function magnitudeLabel(magnitude: number) {
  if (magnitude >= 6) return "SISMO FUERTE"
  if (magnitude >= 4.5) return "SISMO MODERADO"
  if (magnitude >= 3) return "SISMO LEVE"
  return "SISMO MENOR"
}

function validationText(event: EarthquakeEvent) {
  const sources = new Set(event.confirmedBy)
  if (sources.size === 0) return "Sin validar"
  if (sources.has("FUNVISIS")) {
    return sources.size === 1 ? "Validado por FUNVISIS" : `Validado por FUNVISIS y ${sources.size - 1} fuente${sources.size === 2 ? "" : "s"}`
  }
  if (sources.has("SGC")) {
    return sources.size === 1 ? "Validado por SGC" : `Validado por SGC y ${sources.size - 1} fuente${sources.size === 2 ? "" : "s"}`
  }
  return `Confirmado por ${sources.size} fuente${sources.size === 1 ? "" : "s"}`
}

export function earthquakeShareMessage(event: EarthquakeEvent) {
  const sources = event.sources.map((s) => SOURCE_LABEL[s.source]).join(", ")
  const depth = event.depthKm !== null ? `Profundidad: ${event.depthKm.toFixed(1)} km` : null
  const validation = validationText(event)

  const lines: Array<string | null> = [
    `🌍 ${magnitudeLabel(event.magnitude)}`,
    "",
    `📍 Lugar: ${event.place}`,
    `📊 Magnitud: M ${event.magnitude.toFixed(1)}`,
    `🕐 Hora: ${formatDate(event.time)}`,
    depth ? `📏 ${depth}` : null,
    `🔬 Fuentes: ${sources}`,
    `✅ ${validation}`,
    "",
    "Puedes verificar esta informacion y seguir la actividad sismica en tiempo real en:",
    PLATFORM_URL,
  ]

  return lines.filter((line): line is string => line !== null).join("\n")
}

function whatsappShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

async function createEarthquakeSharePhoto(event: EarthquakeEvent) {
  const canvas = document.createElement("canvas")
  canvas.width = SHARE_WIDTH
  canvas.height = SHARE_HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("El navegador no permite preparar la imagen.")

  const accent = magnitudeColor(event.magnitude)
  const pad = 64

  // Background
  ctx.fillStyle = "#0c0c0e"
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT)

  // Top accent bar
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, SHARE_WIDTH, 8)

  // Magnitude circle
  const circleX = SHARE_WIDTH / 2
  const circleY = 280
  const circleR = 170

  ctx.beginPath()
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2)
  ctx.fillStyle = "#141416"
  ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 6
  ctx.stroke()

  ctx.fillStyle = "#71717a"
  ctx.font = "700 36px Inter, Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.fillText("MAGNITUD", circleX, circleY - 72)

  ctx.fillStyle = accent
  ctx.font = `900 ${event.magnitude >= 10 ? "120" : "140"}px Inter, Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.fillText(event.magnitude.toFixed(1), circleX, circleY + 62)

  // Label badge
  const badgeLabel = magnitudeLabel(event.magnitude)
  ctx.font = "800 32px Inter, Arial, sans-serif"
  const badgeW = ctx.measureText(badgeLabel).width + 60
  const badgeH = 56
  const badgeX = (SHARE_WIDTH - badgeW) / 2
  const badgeY = circleY + circleR + 32

  roundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 28)
  ctx.fillStyle = accent + "33"
  ctx.fill()
  roundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 28)
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = accent
  ctx.textAlign = "center"
  ctx.fillText(badgeLabel, SHARE_WIDTH / 2, badgeY + 38)

  // Place
  const placeY = badgeY + badgeH + 60
  ctx.font = "800 48px Inter, Arial, sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "center"
  const placeLines = wrapText(ctx, event.place, SHARE_WIDTH - pad * 2)
  placeLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, SHARE_WIDTH / 2, placeY + i * 58)
  })

  // Details
  const detailStartY = placeY + Math.min(placeLines.length, 3) * 58 + 40
  const details = [
    `Hora: ${formatDate(event.time)}`,
    event.depthKm !== null ? `Profundidad: ${event.depthKm.toFixed(1)} km` : null,
    `Fuentes: ${event.sources.map((s) => SOURCE_LABEL[s.source]).join(" · ")}`,
    validationText(event),
  ].filter((d): d is string => d !== null)

  ctx.font = "500 34px Inter, Arial, sans-serif"
  ctx.fillStyle = "#a1a1aa"
  ctx.textAlign = "center"
  details.forEach((line, i) => {
    ctx.fillText(line, SHARE_WIDTH / 2, detailStartY + i * 48)
  })

  // Bottom platform URL
  ctx.fillStyle = "#3f3f46"
  ctx.fillRect(0, SHARE_HEIGHT - 90, SHARE_WIDTH, 90)
  ctx.font = "600 30px Inter, Arial, sans-serif"
  ctx.fillStyle = "#a1a1aa"
  ctx.textAlign = "center"
  ctx.fillText(PLATFORM_URL, SHARE_WIDTH / 2, SHARE_HEIGHT - 30)

  // Bottom accent bar
  ctx.fillStyle = accent
  ctx.fillRect(0, SHARE_HEIGHT - 8, SHARE_WIDTH, 8)

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], `sismo-m${event.magnitude.toFixed(1)}.png`, { type: "image/png" }))
        return
      }
      reject(new Error("No se pudo crear la imagen para compartir."))
    }, "image/png")
  })
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

export async function shareEarthquake(event: EarthquakeEvent): Promise<ShareResult> {
  const message = earthquakeShareMessage(event)
  const title = `Sismo M ${event.magnitude.toFixed(1)} — ${event.place}`

  try {
    const file = await createEarthquakeSharePhoto(event)
    if (canShareFiles([file])) {
      await copyShareText(message)
      await navigator.share({ title, text: message, files: [file] })
      return "native"
    }
  } catch (error) {
    console.warn(error)
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text: message })
      return "native"
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled"
    }
  }

  window.location.href = whatsappShareUrl(message)
  return "whatsapp"
}
