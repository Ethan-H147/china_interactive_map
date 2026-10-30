# College-town institutional marks

The manifest pairs stable IPEDS college-town IDs with retained institutional seals, shields and wordmarks, source-page URLs, original image URLs and SHA-256 checksums. It lists 44 town entries and 45 institutions. Cambridge contains Harvard's Veritas shield and MIT's stylized wordmark. Princeton uses its university shield.

These marks identify the universities, rather than their sports teams. The other universities use the institutional seals or shields identified by their university reference pages. MIT's stylized mark is extracted from its official website and identified by the MIT Brand Guide. Source links accompany the public logo inventory.

Run `node scripts/build-us-college-logos.mjs` from the repository root. It verifies retained artwork, prepares local assets, creates the paired Harvard/MIT SVG with embedded original images, writes `dist/data/quiz/us-college-logo-sources.json`, and attaches logo paths to the existing college records. The full US miscellaneous builder reads the same mapping when regenerating records. The logo build makes no network calls and rejects athletics sources or sports-asset paths.

Marks remain the property of their respective institutions; source URLs identify the original artwork.
