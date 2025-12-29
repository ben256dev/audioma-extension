let overlayInitialized = false
let overlayContainer = null
let iconWrapper = null
let panel = null
let panelToggleBtn = null
let pauseInput = null
let hideTimeout = null
let isPanelOpen = false
let overlayPauseMsPerChar = 23
let overlayPrimedEnabled = true
const OVERLAY_TIMEOUT_MS = 2500

const ext = globalThis.browser ?? globalThis.chrome

function hasVideo() {
    return !!document.querySelector("video")
}

function clampPauseMs(v) {
    if (!Number.isFinite(v)) return overlayPauseMsPerChar
    v = Math.round(v)
    if (v < 1) return 1
    if (v > 200) return 200
    return v
}

function updatePauseInput() {
    if (!pauseInput) return
    overlayPauseMsPerChar = clampPauseMs(overlayPauseMsPerChar)
    pauseInput.value = String(overlayPauseMsPerChar) + " ms"
}

function savePauseMs() {
    ext.storage.local.set({ pauseMsPerChar: overlayPauseMsPerChar })
}

function updatePanelToggleText() {
    if (!panelToggleBtn) return
    panelToggleBtn.textContent = overlayPrimedEnabled ? "On" : "Off"
}

function savePrimedListening() {
    ext.storage.local.set({ primedListeningEnabled: overlayPrimedEnabled })
}

function closePanel() {
    isPanelOpen = false
    if (iconWrapper) {
        iconWrapper.style.opacity = "1"
        iconWrapper.style.pointerEvents = "auto"
    }
    if (panel) {
        panel.style.transform = "translateX(-200%)"
    }
}

function openPanel() {
    isPanelOpen = true
    if (iconWrapper) {
        iconWrapper.style.opacity = "0"
        iconWrapper.style.pointerEvents = "none"
    }
    if (panel) {
        panel.style.transform = "translateX(0)"
    }
}

function showOverlay() {
    if (!overlayContainer) return
    if (!hasVideo()) return

    const wasHidden = overlayContainer.style.opacity === "0" || overlayContainer.style.opacity === ""

    overlayContainer.style.opacity = "1"
    overlayContainer.style.pointerEvents = "auto"

    if (wasHidden && isPanelOpen) {
        closePanel()
    }

    if (hideTimeout) {
        clearTimeout(hideTimeout)
    }
    hideTimeout = setTimeout(() => {
        overlayContainer.style.opacity = "0"
        overlayContainer.style.pointerEvents = "none"
        if (!isPanelOpen) {
            closePanel()
        } else if (panel) {
            panel.style.transform = "translateX(-200%)"
        }
    }, OVERLAY_TIMEOUT_MS)
}

function onUserActivity(evt) {
    if (!overlayInitialized) return
    if (evt && evt.isTrusted === false) return
    showOverlay()
}

function attachActivityListeners() {
    document.addEventListener("mousemove", onUserActivity)
    document.addEventListener("mousedown", onUserActivity)
    document.addEventListener("keydown", onUserActivity)
    document.addEventListener("touchstart", onUserActivity, { passive: true })
    document.addEventListener("pointermove", onUserActivity)
}

function attachOverlayToFullscreenRoot() {
    if (!overlayContainer) return
    const target = document.fullscreenElement || document.body
    if (overlayContainer.parentNode !== target) {
        target.appendChild(overlayContainer)
    }
}

function createOverlay() {
    if (overlayInitialized) return
    overlayInitialized = true

    overlayContainer = document.createElement("div")
    overlayContainer.id = "audioma-overlay"
    document.body.appendChild(overlayContainer)

    iconWrapper = document.createElement("div")
    iconWrapper.id = "audioma-icon-wrapper"
    overlayContainer.appendChild(iconWrapper)

    const iconBg = document.createElement("div")
    iconBg.id = "audioma-icon-bg"
    iconWrapper.appendChild(iconBg)

    const iconImg = document.createElement("img")
    iconImg.id = "audioma-icon-img"
    try {
        iconImg.src = ext.runtime.getURL("icons/audioma-48.png")
    } catch (e) {
        iconImg.src = "icons/audioma-48.png"
    }
    iconBg.appendChild(iconImg)

    iconWrapper.addEventListener("click", () => {
        openPanel()
        showOverlay()
    })

    panel = document.createElement("div")
    panel.id = "audioma-panel"
    overlayContainer.appendChild(panel)

    const panelHeader = document.createElement("div")
    panelHeader.id = "audioma-panel-header"
    panel.appendChild(panelHeader)

    const panelLabel = document.createElement("div")
    panelLabel.id = "audioma-panel-label"
    panelLabel.textContent = "Audioma Extension Settings"
    panelHeader.appendChild(panelLabel)

    const toggleRow = document.createElement("div")
    toggleRow.id = "audioma-toggle-row"
    panel.appendChild(toggleRow)

    const toggleLabel = document.createElement("span")
    toggleLabel.id = "audioma-toggle-label"
    toggleLabel.textContent = "Primed Listening"
    toggleRow.appendChild(toggleLabel)

    panelToggleBtn = document.createElement("button")
    panelToggleBtn.id = "audioma-panel-toggle"
    toggleRow.appendChild(panelToggleBtn)

    const pauseRow = document.createElement("div")
    pauseRow.id = "audioma-pause-row"
    panel.appendChild(pauseRow)

    const pauseLabel = document.createElement("span")
    pauseLabel.id = "audioma-pause-label"
    pauseLabel.textContent = "Pause Amount"
    pauseRow.appendChild(pauseLabel)

    const pauseWrapper = document.createElement("div")
    pauseWrapper.id = "audioma-pause-wrapper"
    pauseRow.appendChild(pauseWrapper)

    const pauseControls = document.createElement("div")
    pauseControls.id = "audioma-pause-controls"
    pauseWrapper.appendChild(pauseControls)

    const pauseDec = document.createElement("button")
    pauseDec.id = "audioma-pause-dec"
    pauseDec.textContent = "−"
    pauseControls.appendChild(pauseDec)

    pauseInput = document.createElement("input")
    pauseInput.id = "audioma-pause-input"
    pauseInput.type = "text"
    pauseControls.appendChild(pauseInput)

    const pauseInc = document.createElement("button")
    pauseInc.id = "audioma-pause-inc"
    pauseInc.textContent = "+"
    pauseControls.appendChild(pauseInc)

    panelToggleBtn.addEventListener("click", () => {
        overlayPrimedEnabled = !overlayPrimedEnabled
        savePrimedListening()
        updatePanelToggleText()
    })

    pauseDec.addEventListener("click", () => {
        overlayPauseMsPerChar = clampPauseMs(overlayPauseMsPerChar - 1)
        updatePauseInput()
        savePauseMs()
    })

    pauseInc.addEventListener("click", () => {
        overlayPauseMsPerChar = clampPauseMs(overlayPauseMsPerChar + 1)
        updatePauseInput()
        savePauseMs()
    })

    pauseInput.addEventListener("change", () => {
        const text = pauseInput.value || ""
        const m = text.match(/\d+/)
        if (m) {
            const v = parseInt(m[0], 10)
            overlayPauseMsPerChar = clampPauseMs(v)
        }
        updatePauseInput()
        savePauseMs()
    })

    overlayContainer.style.opacity = "0"
    overlayContainer.style.pointerEvents = "none"

    attachOverlayToFullscreenRoot()

    try {
        const keys = ["pauseMsPerChar", "primedListeningEnabled"]
    
        const apply = (result = {}) => {
            if (typeof result.pauseMsPerChar === "number") {
                overlayPauseMsPerChar = clampPauseMs(result.pauseMsPerChar)
            }
            if (typeof result.primedListeningEnabled === "boolean") {
                overlayPrimedEnabled = result.primedListeningEnabled
            }
            updatePanelToggleText()
            updatePauseInput()
        }
    
        const maybePromise = ext.storage.local.get(keys, apply)
    
        if (maybePromise && typeof maybePromise.then === "function") {
            maybePromise.then(apply)
        }
    } catch (_) {
    }

    attachActivityListeners()

    document.addEventListener("fullscreenchange", () => {
        attachOverlayToFullscreenRoot()
    })
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

