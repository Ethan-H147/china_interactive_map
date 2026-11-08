# China pronunciation

All 34 provincial-level entries use the shared ElevenLabs pronunciation release documented in [pronunciation.md](pronunciation.md). The earlier Microsoft pilot is no longer active.

Voice: Daniel — Steady Broadcaster. Each clip reads the Chinese card name in Mandarin, generated in its own request with `language_code: zh`. The shared player loads only clicked files and releases audio on selection, navigation, quiz or history changes.

`dist/china-pronunciations.mjs` is a generated compatibility catalog for China-only checks; `dist/place-pronunciations.mjs` is the shared catalog used by every supported card. Generate future clips with `scripts/prepare-elevenlabs-pronunciations.mjs`. The old Microsoft generation script is disabled to prevent an accidental provider regression. No API key is stored in the website.
