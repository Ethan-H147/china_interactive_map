# Run Boundary Atlas on your iPad

This is a native SwiftUI + Metal prototype, not a website in an embedded browser. It includes China's 34 present-day provincial-level cards, a rotatable globe, a three-dimensional waving flag viewer, local Mandarin recordings and three quiz modes. It works offline after transfer; source links open the browser only when you choose them.

## Open and run

1. Install or update [Swift Playground](https://apps.apple.com/app/id908519492) on your iPad. The project targets iPadOS 17 or newer; use the latest compatible Playground version.
2. On your Windows PC, put **BoundaryAtlas-China-iPad.zip** in iCloud Drive, OneDrive, or another location available in your iPad's Files app.
3. On the iPad, open **Files**, find the ZIP and tap it once to unzip. If it is still in cloud storage, wait for the download to finish first.
4. Open the extracted folder and tap **BoundaryAtlas.swiftpm**. Choose **Swift Playground** if Files asks which app to use. You can also open Swift Playground, choose its Browse/document picker, and browse to the same `.swiftpm` project.
5. Tap the triangular **Run** button. The first build compiles the Swift code and then the small Metal shader library. Keep the full folder intact, including its `Sources` and `Resources` folders.
6. Use Playground's app preview/full-screen control to give the running app the full display. You do not need App Store submission or a paid developer subscription to run it inside Playground.

The `.swiftpm` item is a complete app project, not an individual source file. Open that item, not `Package.swift`, and do not create a new blank app or paste files one by one.

## Try it

- Drag the globe to rotate; pinch to zoom. The globe button zooms out to the planet; the reset arrow returns to China.
- Tap a province to open its card. Search also accepts English, Chinese and the retained regional names. Search is the easiest way to reach Hong Kong and Macao at a distant zoom.
- Tap the small speaker beside the Chinese name. Only one recording is loaded at a time.
- Tap a flag to inspect its waving 3D model. Drag to rotate it, use Pause to stop the cloth motion, then Done to return to the globe. Reduced Motion disables the continuous wave.
- Open Quiz and choose **Name highlighted place**, **Find the named place**, or **Name every place**. During a round, map labels and cards are hidden. Leaving the Quiz tab ends that round. English, Chinese and bundled regional forms are accepted.
- In landscape/full-width windows the panel is on the left. In portrait/narrow windows, use the panel button to open the adjustable bottom sheet. Dismiss it to work with the globe.

## Validation status

Checked on Windows: all 34 province records and recording hashes, source-backed names, packed geometry and indices, shared boundary ownership, water-border omissions, 55 reference camera round trips, all 34 province-centre hit masks, Swift syntax parsing and reference GPU globe mesh draws.

**Not yet verified:** compiling the Apple frameworks/Metal library in Swift Playground, running the Swift XCTest suite, actual iPad touch/layout behaviour, frame rate, audio-session behaviour and peak iPad memory. Windows cannot perform those Apple-platform checks. This is a first native draft; it may need corrections from the first iPad build. The reference GPU previews validate geometry, not the running Swift app.

If Playground displays an error, copy the **first error message**, with its file and line, back into this chat. Do not change the project to a different template. If it reports a missing resource, first confirm the full ZIP finished downloading and was extracted intact. Update Playground/iPadOS if it rejects the package's Swift tools version.

## Current scope

China's provincial level only. No historical snapshots, prefectures/counties, satellite imagery, elections, saved accounts, cloud sync or trophy collection. The national and Hong Kong/Macao/Taiwan flag artwork is reused from the website; this draft's flag viewer renders cloth rather than the website's static image dialog. The global background has coastlines but no other countries' cards or quizzes. The app uses an orthographic globe rather than porting MapLibre's globe-to-Mercator transition.

The bundled app data is approximately **33.1 MiB**, mostly geometry, fonts and approved audio. This is storage size, not a measured runtime memory claim. The generic Playground placeholder icon can be changed later in app settings.

Nothing has been committed, pushed or published.

Apple references: [building apps in Swift Playground](https://developer.apple.com/documentation/swift-playgrounds), [managing playground documents](https://support.apple.com/guide/playgrounds-ipad/itc106ff9caf/ipados).
