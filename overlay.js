let overlayInitialized = false
let overlayContainer = null
let iconWrapper = null
let panel = null
let panelToggleBtn = null
let pauseInput = null
let hideTimeout = null
let isPanelOpen = false
let pauseCoeff = 1.0
const OVERLAY_TIMEOUT_MS = 2500

function ensureAudiomaFlag() {
    if (typeof audiomaEnabled === "undefined") {
        audiomaEnabled = true
    }
}

function hasVideo() {
    return !!document.querySelector("video")
}

function updatePanelToggleText() {
    ensureAudiomaFlag()
    if (!panelToggleBtn) return
    panelToggleBtn.textContent = audiomaEnabled ? "Audioma: On" : "Audioma: Off"
}

function clampPauseCoeff(v) {
    if (v < 0.25) return 0.25
    if (v > 4) return 4
    return v
}

function updatePauseInput() {
    if (!pauseInput) return
    pauseCoeff = clampPauseCoeff(pauseCoeff)
    pauseInput.value = pauseCoeff.toFixed(2)
}

function savePauseCoeff() {
    browser.storage.local.set({ pauseCoeff })
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
        iconImg.src = browser.runtime.getURL("icons/audioma-48.png")
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
    panelLabel.textContent = "Audioma"
    panelHeader.appendChild(panelLabel)

    const pauseRow = document.createElement("div")
    pauseRow.id = "audioma-pause-row"
    panel.appendChild(pauseRow)

    const pauseLabel = document.createElement("span")
    pauseLabel.id = "audioma-pause-label"
    pauseLabel.textContent = "Pause amount"
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
    pauseInput.type = "number"
    pauseInput.step = "0.1"
    pauseInput.min = "0.25"
    pauseInput.max = "4"
    pauseControls.appendChild(pauseInput)

    const pauseInc = document.createElement("button")
    pauseInc.id = "audioma-pause-inc"
    pauseInc.textContent = "+"
    pauseControls.appendChild(pauseInc)

    const toggleRow = document.createElement("div")
    toggleRow.id = "audioma-toggle-row"
    panel.appendChild(toggleRow)

    const toggleLabel = document.createElement("span")
    toggleLabel.id = "audioma-toggle-label"
    toggleLabel.textContent = "Toggle"
    toggleRow.appendChild(toggleLabel)

    panelToggleBtn = document.createElement("button")
    panelToggleBtn.id = "audioma-panel-toggle"
    toggleRow.appendChild(panelToggleBtn)

    panelToggleBtn.addEventListener("click", () => {
        ensureAudiomaFlag()
        audiomaEnabled = !audiomaEnabled
        browser.storage.local.set({ audiomaEnabled })
        updatePanelToggleText()
    })

    pauseDec.addEventListener("click", () => {
        pauseCoeff = clampPauseCoeff(pauseCoeff - 0.1)
        updatePauseInput()
        savePauseCoeff()
    })

    pauseInc.addEventListener("click", () => {
        pauseCoeff = clampPauseCoeff(pauseCoeff + 0.1)
        updatePauseInput()
        savePauseCoeff()
    })

    pauseInput.addEventListener("change", () => {
        const v = parseFloat(pauseInput.value)
        if (Number.isFinite(v)) {
            pauseCoeff = clampPauseCoeff(v)
        }
        updatePauseInput()
        savePauseCoeff()
    })

    overlayContainer.style.opacity = "0"
    overlayContainer.style.pointerEvents = "none"

    attachOverlayToFullscreenRoot()

    browser.storage.local.get(["audiomaEnabled", "pauseCoeff"]).then(result => {
        if (typeof result.audiomaEnabled === "boolean") {
            audiomaEnabled = result.audiomaEnabled
        }
        if (typeof result.pauseCoeff === "number") {
            pauseCoeff = clampPauseCoeff(result.pauseCoeff)
        }
        updatePanelToggleText()
        updatePauseInput()
    })

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

