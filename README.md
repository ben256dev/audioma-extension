# Audioma Extension

## Primed Listening for Netflix in Chrome and Firefox

![Audioma overlay demo](https://shthub.org/u/benjamin/audioma_overlay_demo_0_1_0.gif?raw)

## What Is Primed Listening?

Primed Listening is a technique for content with subtitles. When a subtitle first appears, the media is automatically paused. After an amount of time influenced by the user's preference and the length of the subtitle, the media is automatically resumed. The subtitle is then hidden upon resuming the media.

With Primed Listening, one can understand the meaning of the content while maintaining focus on the original media.

## How Do I Use This Extension?

The settings are accessed by pressing the Audioma icon. They disappear automatically based on cursor or other user activity, just like regular media controls.

* `Primed Listening` may be toggled on or off at any time
* `Pause Amount` controls the subtitle duration coefficient

It is recommended that language learners listen to audio in their target language and enable subtitles in their native language. For minimal reliance on reading, the subtitle duration should be such that there is almost enough time to read the full line, but not quite enough.

It may often be useful to temporarily increase the `Pause Amount`, such as when eating or at the start of an episode where lots of vital context is given. Advanced language learners may choose to set the pause amount extremely low or simply toggle the extension off once a certain level of comprehension is reached.

## Installation

> As a pre-release extension, only temporary installation is supported.

1. Download the [latest release](https://github.com/ben256dev/audioma-extension/releases/latest).
2. Unzip the contents somewhere.
3. Temporarily load the add-on:

* **Chrome**: `chrome://extensions` > Developer mode > Load unpacked > Select the folder containing the add-on
* **Firefox**: `about:debugging#/runtime/this-firefox` > Load Temporary Add-on > Select `manifest.json` from the add-on contents

## I Have an Issue / Feature Request

Please submit an issue via GitHub's Issues tab!

