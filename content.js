let video = null
let subContainer = null
let observer = null
let subText = ""
let styleEl = null
let playingListenerAdded = false

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
            hideSubs()
            console.log("Video is playing, hiding subtitles via CSS")
        })
    }
}

function handleMutation() {
    if (!subContainer || !video) return

    const subTextNew = (subContainer.innerText || "").trim()
    if (subTextNew === subText) return
    if (subTextNew === "") return
    if (subTextNew[0] === "[" && subTextNew[subTextNew.length - 1] === "]") return

    subText = subTextNew
    console.log("New subtitle:", subText)
    showSubs()
    video.pause()
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
