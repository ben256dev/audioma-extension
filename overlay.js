let overlayInitialized = false
let overlayContainer = null
let iconWrapper = null
let panel = null
let panelToggleBtn = null
let pauseInput = null
let minInput = null
let hideTimeout = null
let isPanelOpen = false
let overlayPauseMsPerChar = 23
let overlayMinMs = 0
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

function clampMinMs(v) {
    if (!Number.isFinite(v)) return overlayMinMs
    v = Math.round(v)
    if (v < 0) return 0
    if (v > 4000) return 4000
    return v
}

function updatePauseInput() {
    if (!pauseInput) return
    overlayPauseMsPerChar = clampPauseMs(overlayPauseMsPerChar)
    pauseInput.value = String(overlayPauseMsPerChar) + " ms"
}

function updateMinInput() {
    if (!minInput) return
    overlayMinMs = clampMinMs(overlayMinMs)
    minInput.value = String(overlayMinMs) + " ms"
}

function savePauseMs() {
    ext.storage.local.set({ pauseMsPerChar: overlayPauseMsPerChar })
}

function saveMinMs() {
    ext.storage.local.set({ minMs: overlayMinMs })
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
        iconWrapper.classList.remove("audioma-hidden")
        iconWrapper.classList.add("audioma-clickable")
    }
    if (panel) {
        panel.classList.remove("audioma-panel-open")
    }
}

function openPanel() {
    isPanelOpen = true
    if (iconWrapper) {
        iconWrapper.classList.add("audioma-hidden")
        iconWrapper.classList.remove("audioma-clickable")
    }
    if (panel) {
        panel.classList.add("audioma-panel-open")
    }
}

function showOverlay() {
    if (!overlayContainer) return
    if (!hasVideo()) return

    const wasHidden = !overlayContainer.classList.contains("audioma-overlay-visible")

    overlayContainer.classList.add("audioma-overlay-visible")
    overlayContainer.classList.remove("audioma-overlay-hidden")

    if (wasHidden && isPanelOpen) {
        closePanel()
    }

    if (hideTimeout) {
        clearTimeout(hideTimeout)
    }
    hideTimeout = setTimeout(() => {
        overlayContainer.classList.remove("audioma-overlay-visible")
        overlayContainer.classList.add("audioma-overlay-hidden")
        if (!isPanelOpen) {
            closePanel()
        } else if (panel) {
            panel.classList.remove("audioma-panel-open")
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

function createSettingRow(labelText) {
    const row = document.createElement("div")
    row.className = "audioma-setting-row"

    const label = document.createElement("span")
    label.className = "audioma-setting-label"
    label.textContent = labelText
    row.appendChild(label)

    const wrapper = document.createElement("div")
    wrapper.className = "audioma-setting-wrapper"
    row.appendChild(wrapper)

    const controls = document.createElement("div")
    controls.className = "audioma-setting-controls"
    wrapper.appendChild(controls)

    const dec = document.createElement("button")
    dec.className = "audioma-setting-btn"
    dec.type = "button"
    dec.textContent = "−"
    controls.appendChild(dec)

    const input = document.createElement("input")
    input.className = "audioma-setting-input"
    input.type = "text"
    controls.appendChild(input)

    const inc = document.createElement("button")
    inc.className = "audioma-setting-btn"
    inc.type = "button"
    inc.textContent = "+"
    controls.appendChild(inc)

    return { row, label, wrapper, controls, dec, input, inc }
}

function createOverlay() {
    if (overlayInitialized) return
    overlayInitialized = true

    overlayContainer = document.createElement("div")
    overlayContainer.id = "audioma-overlay"
    overlayContainer.className = "audioma-overlay audioma-overlay-hidden"
    document.body.appendChild(overlayContainer)

    iconWrapper = document.createElement("div")
    iconWrapper.id = "audioma-icon-wrapper"
    iconWrapper.className = "audioma-icon-wrapper audioma-clickable"
    overlayContainer.appendChild(iconWrapper)

    const iconBg = document.createElement("div")
    iconBg.id = "audioma-icon-bg"
    iconBg.className = "audioma-icon-bg"
    iconWrapper.appendChild(iconBg)

    const iconImg = document.createElement("img")
    iconImg.id = "audioma-icon-img"
    iconImg.className = "audioma-icon-img"
    try {
        iconImg.src = ext.runtime.getURL("icons/audioma-48.png")
    } catch (_) {
        iconImg.src = "icons/audioma-48.png"
    }
    iconBg.appendChild(iconImg)

    iconWrapper.addEventListener("click", () => {
        openPanel()
        showOverlay()
    })

    panel = document.createElement("div")
    panel.id = "audioma-panel"
    panel.className = "audioma-panel"
    overlayContainer.appendChild(panel)

    const panelHeader = document.createElement("div")
    panelHeader.id = "audioma-panel-header"
    panelHeader.className = "audioma-panel-header"
    panel.appendChild(panelHeader)

    const panelLabel = document.createElement("div")
    panelLabel.id = "audioma-panel-label"
    panelLabel.className = "audioma-panel-label"
    panelLabel.textContent = "Audioma Extension Settings"
    panelHeader.appendChild(panelLabel)

    const toggleRow = document.createElement("div")
    toggleRow.id = "audioma-toggle-row"
    toggleRow.className = "audioma-setting-row"
    panel.appendChild(toggleRow)

    const toggleLabel = document.createElement("span")
    toggleLabel.id = "audioma-toggle-label"
    toggleLabel.className = "audioma-setting-label"
    toggleLabel.textContent = "Primed Listening"
    toggleRow.appendChild(toggleLabel)

    panelToggleBtn = document.createElement("button")
    panelToggleBtn.id = "audioma-panel-toggle"
    panelToggleBtn.className = "audioma-toggle-btn"
    panelToggleBtn.type = "button"
    toggleRow.appendChild(panelToggleBtn)

    panelToggleBtn.addEventListener("click", () => {
        overlayPrimedEnabled = !overlayPrimedEnabled
        savePrimedListening()
        updatePanelToggleText()
    })

    const pause = createSettingRow("Pause Amount")
    panel.appendChild(pause.row)
    pauseInput = pause.input

    pause.dec.addEventListener("click", () => {
        overlayPauseMsPerChar = clampPauseMs(overlayPauseMsPerChar - 1)
        updatePauseInput()
        savePauseMs()
    })

    pause.inc.addEventListener("click", () => {
        overlayPauseMsPerChar = clampPauseMs(overlayPauseMsPerChar + 1)
        updatePauseInput()
        savePauseMs()
    })

    pauseInput.addEventListener("change", () => {
        const text = pauseInput.value || ""
        const m = text.match(/\d+/)
        if (m) {
            overlayPauseMsPerChar = clampPauseMs(parseInt(m[0], 10))
        }
        updatePauseInput()
        savePauseMs()
    })

    const min = createSettingRow("Minimum Pause")
    panel.appendChild(min.row)
    minInput = min.input

    min.dec.addEventListener("click", () => {
        overlayMinMs = clampMinMs(overlayMinMs - 1)
        updateMinInput()
        saveMinMs()
    })

    min.inc.addEventListener("click", () => {
        overlayMinMs = clampMinMs(overlayMinMs + 1)
        updateMinInput()
        saveMinMs()
    })

    minInput.addEventListener("change", () => {
        const text = minInput.value || ""
        const m = text.match(/\d+/)
        if (m) {
            overlayMinMs = clampMinMs(parseInt(m[0], 10))
        }
        updateMinInput()
        saveMinMs()
    })

    attachOverlayToFullscreenRoot()

    try {
        const keys = ["pauseMsPerChar", "minMs", "primedListeningEnabled"]

        const apply = (result = {}) => {
            if (typeof result.pauseMsPerChar === "number") {
                overlayPauseMsPerChar = clampPauseMs(result.pauseMsPerChar)
            }
            if (typeof result.minMs === "number") {
                overlayMinMs = clampMinMs(result.minMs)
            }
            if (typeof result.primedListeningEnabled === "boolean") {
                overlayPrimedEnabled = result.primedListeningEnabled
            }
            updatePanelToggleText()
            updatePauseInput()
            updateMinInput()
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

    showOverlay()
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

