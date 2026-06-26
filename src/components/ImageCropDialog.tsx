import { useEffect, useMemo, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "./ui/Button"
import { Label } from "./ui/Input"

interface ImageCropDialogProps {
  file: File | null
  onCancel: () => void
  onApply: (file: File, previewUrl: string) => void
}

interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

interface CropFrame {
  width: number
  height: number
  imageWidth: number
  imageHeight: number
  imageX: number
  imageY: number
}

type DragMode = "move" | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"

const MIN_SIZE = 80
const MAX_OUTPUT_SIZE = 1200

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function centeredCrop(width: number, height: number): CropBox {
  const cropWidth = Math.max(MIN_SIZE, width * 0.72)
  const cropHeight = Math.max(MIN_SIZE, height * 0.72)
  return {
    x: (width - cropWidth) / 2,
    y: (height - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  }
}

function cropImage(
  file: File,
  image: HTMLImageElement,
  box: CropBox,
  frame: CropFrame,
  zoom: number,
  pan: { x: number; y: number },
) {
  const scaledWidth = frame.imageWidth * zoom
  const scaledHeight = frame.imageHeight * zoom
  const imageLeft = frame.imageX + (frame.imageWidth - scaledWidth) / 2 + pan.x
  const imageTop = frame.imageY + (frame.imageHeight - scaledHeight) / 2 + pan.y
  const imageRight = imageLeft + scaledWidth
  const imageBottom = imageTop + scaledHeight
  const intersectionLeft = Math.max(box.x, imageLeft)
  const intersectionTop = Math.max(box.y, imageTop)
  const intersectionRight = Math.min(box.x + box.width, imageRight)
  const intersectionBottom = Math.min(box.y + box.height, imageBottom)
  const scaleX = image.naturalWidth / scaledWidth
  const scaleY = image.naturalHeight / scaledHeight

  const outputScale = Math.min(MAX_OUTPUT_SIZE / box.width, MAX_OUTPUT_SIZE / box.height)
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, Math.round(box.width * outputScale))
  canvas.height = Math.max(1, Math.round(box.height * outputScale))
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo preparar el recorte.")

  ctx.fillStyle = "#000000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  if (intersectionRight > intersectionLeft && intersectionBottom > intersectionTop) {
    const sourceX = clamp((intersectionLeft - imageLeft) * scaleX, 0, image.naturalWidth - 1)
    const sourceY = clamp((intersectionTop - imageTop) * scaleY, 0, image.naturalHeight - 1)
    const sourceWidth = clamp((intersectionRight - intersectionLeft) * scaleX, 1, image.naturalWidth - sourceX)
    const sourceHeight = clamp((intersectionBottom - intersectionTop) * scaleY, 1, image.naturalHeight - sourceY)
    const destX = ((intersectionLeft - box.x) / box.width) * canvas.width
    const destY = ((intersectionTop - box.y) / box.height) * canvas.height
    const destWidth = ((intersectionRight - intersectionLeft) / box.width) * canvas.width
    const destHeight = ((intersectionBottom - intersectionTop) / box.height) * canvas.height

    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight)
  }

  return new Promise<{ file: File; previewUrl: string }>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("No se pudo recortar la imagen."))
          return
        }
        const name = file.name.replace(/\.[^.]+$/, "") || "foto"
        const croppedFile = new File([blob], `${name}-recortada.jpg`, { type: "image/jpeg" })
        resolve({ file: croppedFile, previewUrl: URL.createObjectURL(blob) })
      },
      "image/jpeg",
      0.9,
    )
  })
}

export function ImageCropDialog({ file, onCancel, onApply }: ImageCropDialogProps) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{
    mode: DragMode
    startX: number
    startY: number
    startBox: CropBox
  } | null>(null)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState("")
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [rendered, setRendered] = useState<CropFrame>({
    width: 0,
    height: 0,
    imageWidth: 0,
    imageHeight: 0,
    imageX: 0,
    imageY: 0,
  })
  const [box, setBox] = useState<CropBox | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setImage(null)
      setRendered({ width: 0, height: 0, imageWidth: 0, imageHeight: 0, imageX: 0, imageY: 0 })
      setBox(null)
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setError("")
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [file])

  useEffect(() => {
    if (!previewUrl) return
    const nextImage = new Image()
    nextImage.onload = () => setImage(nextImage)
    nextImage.onerror = () => setError("No se pudo leer la imagen.")
    nextImage.src = previewUrl
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (!imageRef.current || !image) return

    const syncSize = () => {
      const frame = frameRef.current
      const node = imageRef.current
      if (!frame || !node) return
      const width = frame.clientWidth
      const height = frame.clientHeight
      const imageWidth = node.clientWidth
      const imageHeight = node.clientHeight
      const imageX = (width - imageWidth) / 2
      const imageY = (height - imageHeight) / 2
      setRendered({ width, height, imageWidth, imageHeight, imageX, imageY })
      setBox(centeredCrop(width, height))
    }

    syncSize()
    window.addEventListener("resize", syncSize)
    return () => window.removeEventListener("resize", syncSize)
  }, [image])

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      event.preventDefault()

      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      const maxWidth = rendered.width
      const maxHeight = rendered.height
      if (drag.mode === "move") {
        setBox({
          ...drag.startBox,
          x: clamp(drag.startBox.x + dx, 0, maxWidth - drag.startBox.width),
          y: clamp(drag.startBox.y + dy, 0, maxHeight - drag.startBox.height),
        })
        return
      } else {
        let left = drag.startBox.x
        let top = drag.startBox.y
        let right = drag.startBox.x + drag.startBox.width
        let bottom = drag.startBox.y + drag.startBox.height

        if (drag.mode.includes("w")) left = clamp(left + dx, 0, right - MIN_SIZE)
        if (drag.mode.includes("e")) right = clamp(right + dx, left + MIN_SIZE, maxWidth)
        if (drag.mode.includes("n")) top = clamp(top + dy, 0, bottom - MIN_SIZE)
        if (drag.mode.includes("s")) bottom = clamp(bottom + dy, top + MIN_SIZE, maxHeight)

        setBox({
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
        })
      }
    }

    const stopDrag = () => {
      dragRef.current = null
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", stopDrag)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", stopDrag)
    }
  }, [rendered])

  if (!file) return null

  function startDrag(mode: DragMode, event: React.PointerEvent) {
    if (!box) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startBox: box,
    }
  }

  async function applyCrop() {
    if (!file || !image || !box || rendered.width === 0 || rendered.height === 0) return
    setApplying(true)
    setError("")
    try {
      const result = await cropImage(file, image, box, rendered, zoom, pan)
      onApply(result.file, result.previewUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recortar la imagen.")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Recortar foto"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-2xl">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">Recortar foto</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Arrastra el marco o ajusta sus esquinas y laterales para elegir el área visible en la tarjeta.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-black p-3">
          <div
            ref={frameRef}
            className="relative mx-auto flex h-[62dvh] min-h-[340px] w-full items-center justify-center overflow-hidden"
          >
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Imagen completa para recortar"
              className="max-h-full max-w-full select-none object-contain"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
              }}
              draggable={false}
            />
            {box && (
              <>
                <div className="pointer-events-none absolute inset-0 bg-black/45" />
                <div
                  className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.48)]"
                  style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                  }}
                  onPointerDown={(event) => startDrag("move", event)}
                >
                  <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <span key={index} className="border border-white/25" />
                    ))}
                  </div>
                  {([
                    ["nw", "-left-2.5 -top-2.5 cursor-nwse-resize"],
                    ["n", "left-1/2 -top-2.5 -translate-x-1/2 cursor-ns-resize"],
                    ["ne", "-right-2.5 -top-2.5 cursor-nesw-resize"],
                    ["e", "-right-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize"],
                    ["se", "-bottom-2.5 -right-2.5 cursor-nwse-resize"],
                    ["s", "-bottom-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize"],
                    ["sw", "-bottom-2.5 -left-2.5 cursor-nesw-resize"],
                    ["w", "-left-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize"],
                  ] as const).map(([mode, positionClass]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-label={`Ajustar recorte ${mode}`}
                      className={`absolute size-5 rounded-full border-2 border-white bg-[var(--primary)] ${positionClass}`}
                      onPointerDown={(event) => startDrag(mode, event)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="crop-zoom">Zoom</Label>
            <input
              id="crop-zoom"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="crop-pan-x">Horizontal</Label>
            <input
              id="crop-pan-x"
              type="range"
              min={-rendered.width}
              max={rendered.width}
              value={pan.x}
              onChange={(event) => setPan((current) => ({ ...current, x: Number(event.target.value) }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="crop-pan-y">Vertical</Label>
            <input
              id="crop-pan-y"
              type="range"
              min={-rendered.height}
              max={rendered.height}
              value={pan.y}
              onChange={(event) => setPan((current) => ({ ...current, y: Number(event.target.value) }))}
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-red-400">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="tertiary" onClick={onCancel} disabled={applying}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={applyCrop} disabled={applying || !image || !box}>
            {applying && <Loader2 className="size-4 animate-spin" />}
            Usar foto recortada
          </Button>
        </div>
      </div>
    </div>
  )
}
