const CACHE_NAME = "red-help-ve-shell-v1"
const SHELL_ASSETS = ["/", "/favicon.svg", "/manifest.webmanifest"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith("/api/")) return
  if (event.request.method !== "GET") return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match("/"))),
  )
})

self.addEventListener("push", (event) => {
  const fallback = {
    title: "Alerta sismica",
    body: "Se detecto un sismo relevante.",
    url: "/",
  }
  const data = event.data ? event.data.json() : fallback
  const title = data.title || fallback.title
  const magnitude = Number(data.magnitude || 0)

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || fallback.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      tag: data.eventId ? `earthquake-${data.eventId}` : "earthquake-alert",
      renotify: true,
      requireInteraction: magnitude >= 5,
      silent: false,
      vibrate: magnitude >= 5 ? [700, 200, 700, 200, 700] : [300, 120, 300],
      data: {
        url: data.url || fallback.url,
        eventId: data.eventId,
      },
    }),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client)
      if (existingClient) return existingClient.focus()
      return self.clients.openWindow(targetUrl)
    }),
  )
})
