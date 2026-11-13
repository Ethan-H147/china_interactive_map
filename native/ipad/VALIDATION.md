# Verification record

Revision 0.1.1 addresses the two iPad-reported `MTKViewDelegate` actor-isolation warnings. Delegate witnesses are explicitly nonisolated; UIKit callbacks enter the main actor synchronously, while any off-main callback is forwarded to it. Rendering state remains main-actor isolated. The package version/build was bumped to refresh the preview build. Confirmation in Swift Playground remains pending.

Completed locally on Windows:

- Parsed every Swift source and package manifest with tree-sitter-swift without syntax errors. This is **not** Swift type checking.
- Verified SHA-256 and byte counts for every bundled resource.
- Verified 34 unique province records, 34 approved MP3s and source-backed regional name aliases.
- Verified indexed meshes: indices in range, finite coordinates, province coverage, correct binary strides and no globe triangle edge longer than 2.01 degrees.
- Verified all exported line instances have two distinct provincial owners. The exporter filters them against the website's retained visible segments, preserving water-border omissions.
- Checked 55 reference camera projection/inverse-projection round trips and all 34 province-centre point-in-polygon hit masks.
- Rendered the actual indexed resources in a reference WebGL globe with China and global framing; checked GPU errors and visually inspected the results. This is a geometry check, **not a screenshot of the native app**.

Not run on this Windows host:

- Swift compiler type checking against Apple SDKs.
- Swift Playground/Xcode app build or install.
- Runtime Metal shader compilation.
- The included `AtlasCoreTests` XCTest suite.
- iPad touch, rotation, sheets, VoiceOver, native audio, actual frame rate and peak-memory measurements.

First device acceptance pass: open/run the project; verify the globe and all 34 searchable cards; play/stop several recordings; background/resume the app; rotate the iPad; inspect/pause/rotate each bundled flag; complete a round in each quiz mode; verify labels/cards disappear during quizzes and reappear after ending them. Check that a new recording stops the old one and that returning from flag inspection restores map gestures.
