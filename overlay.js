let overlayInitialized = false

function updateToggleButtonText(btn) {
    btn.textContent = audiomaEnabled ? "Audioma: On" : "Audioma: Off"
}

function createOverlay() {
    if (overlayInitialized) return
    overlayInitialized = true

    const container = document.createElement("div")
    container.id = "audioma-overlay"

    const btn = document.createElement("button")
    btn.id = "audioma-toggle"
    updateToggleButtonText(btn)

    btn.addEventListener("click", () => {
        audiomaEnabled = !audiomaEnabled
        updateToggleButtonText(btn)
        browser.storage.local.set({ audiomaEnabled })
    })

    container.appendChild(btn)
    document.body.appendChild(container)

    browser.storage.local.get("audiomaEnabled").then(result => {
        if (typeof result.audiomaEnabled === "boolean") {
            audiomaEnabled = result.audiomaEnabled
            updateToggleButtonText(btn)
        }
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

