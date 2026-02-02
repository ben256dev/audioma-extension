let video = null
let subContainer = null
let observer = null
let subText = ""
let styleEl = null
let playingListenerAdded = false
let autoSlowTimeout = null
let isAutoSlow = false
let userPaused = false
let lastPlaybackRate = 1
let pauseMsPerChar = 23
let minMs = 0
let primedListeningEnabled = true
let seenSubtitleOnce = false

function ensureStyle() {
    if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = "nf-substyle"
        document.head.appendChild(styleEl)
    }
}

function getMode() {
    const host = location.hostname || ""
    if (host.includes("netflix.com")) return "netflix"
    if (host.includes("youtube.com")) return "youtube"
    return "unknown"
}

function showSubs() {
    ensureStyle()
    const mode = getMode()
    if (mode === "netflix") {
        styleEl.textContent = ".player-timedtext { opacity: 1 !important; }"
        return
    }
    if (mode === "youtube") {
        styleEl.textContent = ".caption-window, .ytp-caption-window-container, .captions-text { opacity: 1 !important; }"
        return
    }
    styleEl.textContent = ""
}

function hideSubs() {
    ensureStyle()
    const mode = getMode()
    if (mode === "netflix") {
        styleEl.textContent = ".player-timedtext { opacity: 0 !important; }"
        return
    }
    if (mode === "youtube") {
        styleEl.textContent = ".caption-window, .ytp-caption-window-container, .captions-text { opacity: 0 !important; }"
        return
    }
    styleEl.textContent = ""
}

function resetSubsStyle() {
    if (!styleEl) return
    styleEl.textContent = ""
}

function findVideo() {
    if (video && !video.closest("body")) video = null
    if (!video) {
        const vids = document.querySelectorAll("video")
        if (vids.length > 0) video = vids[0]
    }

    if (video && !playingListenerAdded) {
        playingListenerAdded = true

        video.addEventListener("playing", () => {
            userPaused = false
            if (!primedListeningEnabled) {
                resetSubsStyle()
                return
            }

            const mode = getMode()

            if (mode === "netflix") {
                if (!isAutoSlow) hideSubs()
                return
            }

            if (mode === "youtube") {
                if (!seenSubtitleOnce) {
                    resetSubsStyle()
                    return
                }
                if (!isAutoSlow) hideSubs()
                return
            }
        })

        video.addEventListener("pause", () => {
            userPaused = true
            if (autoSlowTimeout) {
                clearTimeout(autoSlowTimeout)
                autoSlowTimeout = null
            }
            if (isAutoSlow) {
                video.playbackRate = lastPlaybackRate || 1
                isAutoSlow = false
            }
        })

        video.addEventListener("play", () => {
            userPaused = false
        })
    }
}

function readSubtitleText() {
    if (!subContainer) return ""

    const mode = getMode()

    if (mode === "netflix") {
        return (subContainer.innerText || "").trim()
    }

    if (mode === "youtube") {
        const segs = subContainer.querySelectorAll(".ytp-caption-segment")
        if (segs && segs.length > 0) {
            const parts = []
            for (const s of segs) {
                const t = (s.textContent || "").trim()
                if (t) parts.push(t)
            }
            return parts.join("\n").trim()
        }
        return (subContainer.innerText || "").trim()
    }

    return (subContainer.innerText || "").trim()
}

function shouldIgnoreSubtitleText(t) {
    if (!t) return true
    if (t[0] === "[" && t[t.length - 1] === "]") return true
    return false
}

function processSubtitleText(subTextNew) {
    if (!subContainer || !video) return
    if (!primedListeningEnabled) return

    if (subTextNew === subText) return
    if (subTextNew === "") return
    if (shouldIgnoreSubtitleText(subTextNew)) return

    subText = subTextNew
    seenSubtitleOnce = true

    if (video.paused || userPaused) return

    showSubs()

    if (autoSlowTimeout) {
        clearTimeout(autoSlowTimeout)
        autoSlowTimeout = null
    }

    if (!isAutoSlow) {
        lastPlaybackRate = video.playbackRate || 1
        video.playbackRate = 0.0
        isAutoSlow = true
    }

    const length = subText.length
    const maxMs = 4000
    let delay = length * pauseMsPerChar
    if (delay < minMs) delay = minMs
    if (delay > maxMs) delay = maxMs

    autoSlowTimeout = setTimeout(() => {
        autoSlowTimeout = null
        if (!video) return
        if (userPaused) return
        if (!isAutoSlow) return
        hideSubs()
        video.playbackRate = lastPlaybackRate || 1
        isAutoSlow = false
    }, delay)
}

function handleMutation() {
    if (!subContainer || !video) return
    if (!primedListeningEnabled) return

    const subTextNew = readSubtitleText()
    processSubtitleText(subTextNew)
}

function setupObserver() {
    if (!subContainer) return
    if (observer) observer.disconnect()

    observer = new MutationObserver(handleMutation)
    observer.observe(subContainer, {
        childList: true,
        subtree: true,
        characterData: true
    })
}

function findSubContainer() {
    const mode = getMode()

    let el = null

    if (mode === "netflix") {
        el = document.querySelector("div.player-timedtext")
    } else if (mode === "youtube") {
        el =
            document.querySelector("div.caption-window") ||
            document.querySelector("div.ytp-caption-window-container") ||
            document.querySelector("span.captions-text")
    }

    if (el !== subContainer) {
        subContainer = el
        subText = ""

        if (observer) {
            observer.disconnect()
            observer = null
        }
        if (subContainer) {
            setupObserver()
        }
    }
}

function loadSettingsFromStorage() {
    const ext =
        (typeof browser !== "undefined" && browser) ? browser :
        (typeof chrome !== "undefined" && chrome) ? chrome :
        null

    if (!ext || !ext.storage || !ext.storage.local) return

    const apply = (result = {}) => {
        if (typeof result.minMs === "number") {
            minMs = result.minMs
            console.log("Audioma minMs loaded:", minMs)
        }
        if (typeof result.pauseMsPerChar === "number") {
            pauseMsPerChar = result.pauseMsPerChar
            console.log("Audioma pauseMsPerChar loaded:", pauseMsPerChar)
        }
        if (typeof result.primedListeningEnabled === "boolean") {
            primedListeningEnabled = result.primedListeningEnabled
            console.log("Audioma primedListeningEnabled loaded:", primedListeningEnabled)
            if (!primedListeningEnabled) resetSubsStyle()
        }
    }

    try {
        const maybePromise = ext.storage.local.get(
            ["pauseMsPerChar", "minMs", "primedListeningEnabled"],
            apply
        )

        if (maybePromise && typeof maybePromise.then === "function") {
            maybePromise.then(apply)
        }
    } catch (_) {
    }

    ext.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return

        if (changes.minMs && typeof changes.minMs.newValue === "number") {
            minMs = changes.minMs.newValue
            console.log("Audioma minMs updated:", minMs)
        }
        if (changes.pauseMsPerChar && typeof changes.pauseMsPerChar.newValue === "number") {
            pauseMsPerChar = changes.pauseMsPerChar.newValue
            console.log("Audioma pauseMsPerChar updated:", pauseMsPerChar)
        }
        if (changes.primedListeningEnabled && typeof changes.primedListeningEnabled.newValue === "boolean") {
            primedListeningEnabled = changes.primedListeningEnabled.newValue
            console.log("Audioma primedListeningEnabled updated:", primedListeningEnabled)
            if (!primedListeningEnabled) resetSubsStyle()
        }
    })
}

function tick() {
    findVideo()
    findSubContainer()

    if (getMode() === "youtube" && subContainer && primedListeningEnabled) {
        const subTextNew = readSubtitleText()
        processSubtitleText(subTextNew)
    }

    setTimeout(tick, 100)
}

function init() {
    findVideo()
    loadSettingsFromStorage()
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
} else {
    init()
}

tick()

