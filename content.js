let video = null
let subContainer = null
let observer = null
let subText = ""
let styleEl = null
let playingListenerAdded = false
let audiomaEnabled = true
let autoSlowTimeout = null
let isAutoSlow = false
let userPaused = false
let lastPlaybackRate = 1

function ensureStyle() {
    if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = "nf-substyle"
        document.head.appendChild(styleEl)
    }
}

function showSubs() {
    ensureStyle()
    styleEl.textContent = ".player-timedtext { opacity: 1 !important; }"
}

function hideSubs() {
    ensureStyle()
    styleEl.textContent = ".player-timedtext { opacity: 0 !important; }"
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
            if (!audiomaEnabled) return
            userPaused = false
            if (!isAutoSlow) hideSubs()
            console.log("Video is playing, hiding subtitles via CSS")
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

function handleMutation() {
    if (!subContainer || !video) return
    if (!audiomaEnabled) return

    const subTextNew = (subContainer.innerText || "").trim()
    if (subTextNew === subText) return
    if (subTextNew === "") return
    if (subTextNew[0] === "[" && subTextNew[subTextNew.length - 1] === "]") return

    subText = subTextNew
    if (video.paused || userPaused) return

    console.log("New subtitle:", subText)
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
    const perCharMs = 23
    const minMs = 0
    const maxMs = 4000
    let delay = length * perCharMs
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
    const el = document.querySelector("div.player-timedtext")
    if (el !== subContainer) {
        subContainer = el
        if (observer) {
            observer.disconnect()
            observer = null
        }
        if (subContainer) {
            setupObserver()
        }
    }
}

function tick() {
    findVideo()
    findSubContainer()
    setTimeout(tick, 100)
}

function init() {
    findVideo()
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
} else {
    init()
}

tick()

