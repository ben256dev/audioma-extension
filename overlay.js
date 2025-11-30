let overlayInitialized = false
let overlayContainer = null
let hideTimeout = null
const OVERLAY_TIMEOUT_MS = 2500

function ensureAudiomaFlag() {
    if (typeof audiomaEnabled === "undefined") {
        audiomaEnabled = true
    }
}

function hasVideo() {
    return !!document.querySelector("video")
}

function updateToggleButtonText() {
    ensureAudiomaFlag()
    const btn = document.getElementById("audioma-toggle")
    if (!btn) return
    btn.textContent = audiomaEnabled ? "Audioma: On" : "Audioma: Off"
}

function showOverlay() {
    if (!overlayContainer) return
    if (!hasVideo()) return

    overlayContainer.style.opacity = "1"
    overlayContainer.style.pointerEvents = "auto"

    if (hideTimeout) {
        clearTimeout(hideTimeout)
    }
    hideTimeout = setTimeout(() => {
        overlayContainer.style.opacity = "0"
        overlayContainer.style.pointerEvents = "none"
    }, OVERLAY_TIMEOUT_MS)
}

function onUserActivity() {
    if (!overlayInitialized) return
    showOverlay()
}

function attachActivityListeners() {
    document.addEventListener("mousemove", onUserActivity)
    document.addEventListener("mousedown", onUserActivity)
    document.addEventListener("keydown", onUserActivity)
    document.addEventListener("touchstart", onUserActivity, { passive: true })
    document.addEventListener("pointermove", onUserActivity)
}

function createOverlay() {
    if (overlayInitialized) return
    overlayInitialized = true

    const container = document.createElement("div")
    container.id = "audioma-overlay"
    overlayContainer = container

    const btn = document.createElement("button")
    btn.id = "audioma-toggle"

    btn.addEventListener("click", () => {
        ensureAudiomaFlag()
        audiomaEnabled = !audiomaEnabled
        browser.storage.local.set({ audiomaEnabled })
        updateToggleButtonText()
    })

    container.appendChild(btn)
    document.body.appendChild(container)

    overlayContainer.style.opacity = "0"
    overlayContainer.style.pointerEvents = "none"

    browser.storage.local.get("audiomaEnabled").then(result => {
        if (typeof result.audiomaEnabled === "boolean") {
            audiomaEnabled = result.audiomaEnabled
        }
        updateToggleButtonText()
    })

    attachActivityListeners()
}

function initOverlay() {
    if (document.body) {
        createOverlay()
    } else {
        const obs = new MutationObserver(() => {
            if (document.body) {
                obs.disconnect()
                createOverlay()
            }
        })
        obs.observe(document.documentElement, { childList: true, subtree: true })
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOverlay)
} else {
    initOverlay()
}

