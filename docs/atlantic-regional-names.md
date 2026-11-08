# UK and France regional place names

Cards follow the Spain hierarchy: English heading, the national-language name only when different, then each regional language label followed by its attested place name. When only one regional language has a name, a spelling already shown in either heading is omitted. When multiple regional languages have names, each keeps its own labeled row, including spellings matching a heading or another regional language. Language labels are plain text; source links remain in Sources & coverage. UK English is not repeated. France retains French as the second heading. The Isle of Man remains a Crown Dependency; its card adds Manx.

The shared renderer has an optional `labelFirst` setting; its ordering for existing countries is unchanged. Duplicate suppression and plain language labels apply to every caller. UK settlement cards reuse the retained Ordnance Survey and national statistical names. Imported forms remain in each country's own data lifecycle, so the one-active-country memory budget is retained. No new global name cache is introduced.

## Coverage

- UK administrative cards: Welsh, Scottish Gaelic, Scots, Irish, Ulster Scots, Cornish and Manx. 68 administrative records carry 99 forms. Existing and imported settlement forms add Welsh, Gaelic and Ulster Scots coverage.
- European France: Breton, Gallo, Basque, Occitan, Catalan, Corsican, Alsatian, Lorraine Franconian, West Flemish, Franco-Provençal / Arpitan, Norman and Picard. 21,174 administrative records carry 23,835 forms. Coverage varies substantially by language; Lorraine Franconian currently has the documented Thionville forms only.
- City-quiz catalogues are enriched separately because those quizzes do not read the administrative catalogue.
- Jèrriais, Guernésiais and overseas French languages are outside this pass.

Names are matched by GSS or INSEE codes and checked against relevant language areas. UK council-area identities are disambiguated from towns and historical authorities using their English Wikidata identities. Multiple conflicting forms for a code are skipped. Regional names are never inherited from a parent.

Wikidata labels are CC0. Manual references are retained in `scripts/name-sources/atlantic/overrides.json`, including the Isle of Man Government, the Ulster-Scots Agency / Academy, Région Bretagne and referenced Lorraine toponymy. Gallo commune names come from Régis Auffray's published list on Du galo en Bertègn; theoretical, rare, pejorative and flagged erroneous forms are excluded. Its published orthography is one attested convention, not a claim that other Gallo spellings are wrong.

Every displayed form is available as a quiz alias. English and French names remain accepted. Shared answer normalization continues to ignore case, accents and punctuation. Language labels themselves are not answer text.

## Rebuild and verification

Run from the atlas checkout:

```
node scripts/prepare-atlantic-regional-names.mjs
node scripts/validate-atlantic-regional-names.mjs
node scripts/browser/run.mjs atlantic-regional-names spain-card-names
```

The builder uses the retained complete source responses offline. `coverage-audit.json` lists counts and excluded conflicts. `geography-baseline.json` verifies that record identities, primary names and geographic fields were preserved. The language update does not write any map geometry assets.

The browser checks all 19 language labels, the English/French heading hierarchy, live typing of Manx and Breton quiz answers, and phone layouts. The data check tests every imported administrative form and each regional city-quiz form through both typed answer engines.

All work remains local; no commit, push, source synchronization or deployment is part of this workflow.
