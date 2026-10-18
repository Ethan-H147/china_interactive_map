# Mainland Southeast Asia and first-level quizzes

Thailand and Vietnam use `countries.js` and the shared regional renderer. They retain its worker decoding, selected-outline index, adaptive detail, lazy chunks and three-country resident limit. Nothing is published by these build commands.

Thailand has 77 first-level areas (76 provinces and Bangkok), 928 mapped districts and a local-area layer containing 7,420 code-matched subdistricts, 234 geographic islands, one separate municipal footprint and three older subdistrict footprints. The latter records are labelled explicitly. The retained DDPM source does not separately delineate 16 current subdistrict codes, mostly later Bangkok splits; their boundaries are not fabricated. Source code `AMP_CODE="Ko Thian"` is repaired to district 2306 from its six-digit hierarchy. NSO/DOPA registered population is dated 31 December 2024 and totals 65,951,210; it is not usually-resident census population.

Vietnam uses the September 2026 code list: 34 first-level areas, including nine centrally governed cities after the September status changes, and 3,321 communes, wards and special zones. The abolished district tier is absent. Geometry comes from the retained July 2026 export, with the existing China land frontier reconciled before parent geometry is dissolved. Paracel and Spratly source sea/reef envelopes are clipped to retained OpenStreetMap dry-land coastline. The source's offshore claims are described in the relevant pages and source notes. The 2025 administrative-reorganisation population is available for 23 merged areas; other populations and GDP are not estimated.

Rebuild from retained inputs:

    npm run build:mainland-seasia
    npm run test:mainland-seasia
    node scripts/browser/run.mjs mainland-seasia

`npm run fetch:mainland-seasia` retrieves missing inputs. JSON snapshots and the original archive are SHA-256 checked. Large ZIP caches are ignored by Git; the retained per-province JSON snapshots, URLs, dates and hashes remain reproducible. Map data, administrative labels and source notes must be regenerated together.

The reusable `first-level-quiz.mjs` controller provides map-click and naming rounds for the US, Canada, Spain, France, Germany, Italy, Malaysia and India. Country configuration controls availability and exclusions. The renderer adapters expose records, a selection snapshot, first-level preparation and answer-outline hooks; they do not duplicate scoring or quiz UI. Scoring uses the existing China engine, and naming uses its normalisation and answer engine. Each naming round saves under a separate country key. Mainland/core and overseas best scores are separate.

US rounds default to the 50 states and DC; overseas territories can be included. France defaults to its 13 metropolitan regions, with an overseas option. Spain includes its 17 autonomous communities and Ceuta/Melilla; its separate central-government island grouping is excluded. Other requested countries use their mapped first-level administrative units. No counties, communes, districts, municipalities, ZIPs or telephone areas enter these quizzes.

During a quiz, labels and normal selection/search controls are suppressed, color metrics are suspended, imagery is hidden, and clicks are limited to the first-level source. Results, answer review, correct/wrong highlights, keyboard map selection, phone prompts and naming resume share one controller. Exiting restores the previous selection, mode, sidebar panel, geographic view and color settings. China's existing controller and saved naming rounds remain separate.

    npm run test:first-level-quiz
    npm run test:first-level-quiz-browser

Local previews:

- http://127.0.0.1:4174/?preview=mainland-seasia-quiz#thailand
- http://127.0.0.1:4174/?preview=mainland-seasia-quiz#vietnam
- http://127.0.0.1:4174/?preview=mainland-seasia-quiz#united-states

US quiz framing uses the mainland bounds declared in the country registry. Alaska and Hawaii appear in two clickable SVG inset maps at the bottom left; their answers use the same scoring, review and naming state as the main map. Answer review for either inset keeps the camera over the mainland. Find-place rounds tuck the phone panel down to leave room for the map and question prompt. Exiting removes the inset elements and their resize observer.

The inset silhouettes are generated from the existing state boundaries with `npm run build:quiz-insets`. Alaska uses an Albers projection continuous across the date line; Hawaii’s thumbnail shows its principal islands. Simplification applies only to these small display silhouettes. Full map geometry and close-up detail are unchanged, and the insets create no additional WebGL maps. Run `npm run test:first-level-quiz-browser` to cover inset answers, mainland framing, name rounds, phone touches and cleanup alongside the other first-level quizzes.
