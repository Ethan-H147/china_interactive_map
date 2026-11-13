# Native Boundary Atlas architecture

## Boundaries of responsibility

`AtlasCore` contains versioned, data-only country manifests, shared region identities, search/answer normalization, geographic hit masks, camera projection/inverse projection and deterministic quiz transitions. It imports Foundation, not SwiftUI, UIKit, Metal or AVFoundation. `CountryRepository` is the acquisition boundary; the bundled actor has one resident country plus one separately cached global background. The app's country ID is configured in `AtlasStore` rather than spread through the renderer.

`AtlasApp` contains one main-actor `AtlasStore`, a lightweight camera controller, one local audio player, SwiftUI views and one Metal resource pool. The same region IDs and names drive taps, selection, search, cards, speech and quiz answers. No second quiz-only map or disconnected card cache exists.

`AtlasMetalView` adapts the same renderer for globe and cloth scenes. One Metal device, command queue, shader library and pipeline pool serve both. Globe meshes are indexed and drawn as GPU buffers. Interior triangles are subdivided before export, so the globe is curved through polygon interiors, not only at coast vertices. Shared line segments are instanced into screen-width strips; retained website omissions filter out unwanted coastal/water strokes. The flag mesh uses sourced artwork on a deforming, rotatable surface. There are no WebViews, JavaScript runtimes, map-service dependencies or third-party Swift package downloads.

## Lifecycle and memory policy

- Country acquisition/decoding runs in an actor. Source geography is converted to GPU-ready little-endian buffers before distribution, not triangulated on the iPad's UI thread.
- The repository retains one country. Shared world geometry lives under `Resources/Global`; a future country pack references it rather than copying it into another country's geometry.
- The GPU resource pool retains one country and one global background. Replacing a country releases the previous country buffers before installing the next. One flag texture is cached; closing inspection releases it.
- Map rendering is demand-driven while idle. Gesture inertia has its own display link, which is invalidated on exit. Continuous flag frames stop when paused, backgrounded or Reduced Motion is enabled. The globe behind flag inspection stays idle.
- Gesture/camera changes go straight to the renderer. They do not publish per-frame coordinates through the SwiftUI root view.
- One `AVAudioPlayer` is created on demand. Changing selection, entering a quiz, inspecting a flag or leaving the active app stops and releases it. Delegate callbacks check player identity before affecting newer playback.
- CPU hit masks preserve holes. Label/focus points come from the website and are verified to lie inside their own regions. Smaller offshore divisions also remain reachable through the searchable native list.
- SwiftUI state stays on the main actor. Immutable country data is Sendable. Shader uniforms have six 16-byte vectors, matching the Metal definition's 96-byte layout.

## Data and rebuilds

`scripts/export-atlas.mjs` reads the existing atlas checkout. It reuses the full China display pack, repaired fragment fills, existing boundary omissions, regional names, population/statistics, flag originals and 34 approved pronunciation recordings. It cleans/generalizes only the neutral world backdrop. Asset SHA-256 values and byte counts are recorded in `asset-inventory.json`; audio provenance is retained in `Resources/source-notes.json`. Noto font licenses travel with the resources.

From the atlas repository root after copying this project into `native/ipad`:

```text
node native/ipad/scripts/export-atlas.mjs
node native/ipad/tests/validate-export.mjs
node native/ipad/tests/check-camera.mjs
```

The exporter uses the atlas's existing `earcut`, `mapshaper` and `sharp` development dependencies. It does not fetch remote data or run speech synthesis. Run `scripts/check-swift.py` with Python plus `tree-sitter` and `tree-sitter-swift` installed; these are developer checks, not app dependencies. The optional GPU reference preview needs the atlas's browser harness. On an Apple SDK host, open the app project and run `AtlasCoreTests` in Xcode. Swift Playground runs the app; it does not supply the XCTest runner.

## Adding countries and deeper levels

For another first-level country, export another manifest and country mesh using this schema; pass its ID into `AtlasStore`. The core camera, renderer, cards, speech control and quiz engines remain shared. Generalize the export entry point into one per-country adapter with a single common writer, rather than copying the app or rendering pipeline. IDs must remain country-qualified or globally unique.

This prototype deliberately loads one provincial pack. Before adding China counties or a country with thousands of units, extend `GeometryManifest` into a versioned chunk directory with per-level bounds, vertex/index ranges and LOD budgets; add cancellation-aware region loading to `CountryRepository` and spatial queries to the hit-mask store. Retain one active collection and a byte-bounded neighbour cache. Do not decode every subdivision at launch or duplicate the same geometry for quiz, card and globe. Preserve the existing selection identity while swapping LODs.

Future historical snapshots should use the same dataset identity and collection interface, with an explicit snapshot generation token so late loads cannot replace newer selections. A renderer protocol can support a later Mercator transition or alternative Metal renderer without moving selection/quiz logic into view code.

## Verification limits

Windows structural/data checks are not an Apple build. The tree-sitter pass verifies parsing, not SDK availability, type correctness or Metal compilation. The WebGL reference uses the same indexed resources and projection equations to inspect exported topology; it does not stand in for native UI, gesture, performance or shader testing. Those require an iPad or an Apple SDK build host. No numeric performance or crash-freedom guarantee is made from the reference checks.
