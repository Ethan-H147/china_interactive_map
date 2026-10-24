# Website deployment

Pushing runtime or build changes to `main` runs **Deploy website to GitHub Pages**. The workflow validates the application syntax, country routes and assets, shared map runtime, and compact-source checksums with `npm run test:deployment`. It then stamps the commit version and creates the publication package with `scripts/build-pages-package.mjs`.

Packaging verifies every compact conversion and keeps the published tree under the Pages size limit. The prepared Pages artifact is uploaded once and deployed by a second job. A failed essential check or package build still prevents publication.

The full browser matrix and detailed national data audits remain in **Run full atlas regression audit**, launched manually from the Actions tab. They are independent of deployment. The previous deployment workflow required all of those jobs to pass; failures in unrelated country scenarios and detailed border audits repeatedly skipped the deploy job even when the website package built successfully. This change removes that publication requirement, without marking those failing tests as passed or deleting them.

GitHub Pages publishes at `https://ethan-h147.github.io/china_interactive_map/`. An external Cloudflare project connected to this repository has its own build and deployment settings; the GitHub Actions workflow does not control those settings. The existing ChatGPT Site hosting adapter also has its own pinned-source publication process, documented in `hosting/README.md`.
