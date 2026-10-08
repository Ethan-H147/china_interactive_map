# Country pages

`dist/country-page.mjs` owns the sidebar structure for every country. Its order is search, tabs, map controls or selected-place heading, info cards, subdivision list, place actions, and footer. `country-page.css` owns shared layout rules.

Country adapters supply content slots to `countryPageMarkup` or `createCountryPage`. Search is a configuration object with its ID, label, placeholder, and results ID. The heading configuration supplies navigation/flag markup, kind and name IDs, and optional multilingual names. The shared builder renders the search field, tabs, and place heading. Adapters own names, flags, available map controls, geography loading, selection, and source-specific data; they do not define another sidebar layout. China's adapter is `china-page.mjs`; Korea and Mongolia supply their slots through their panel modules; the other atlas modules supply slots during initialization. The shared builder preserves the element IDs used by the map controllers, view links, quiz, and comparison tools.

Population and economic figures are optional cards inside `.country-info-cards`. `statistics.mjs` supplies the shared area and economy cards and, where appropriate, population cards. The existing census renderers add their own population cards in the same slot. `insertInfoCard` inserts a card without changing the page structure. Missing coverage does not invent figures or inherit a parent's statistics. `clearStatistics` cancels a selected card's pending update when the selection changes.

Subdivision counts belong in the subdivision heading, through `setSubdivisionHeading`. Do not add counts, parent descriptions, administrative codes, or instructions about loading below a place name. Essential boundary caveats can be a separate optional card; source dates and definitions belong in disclosures.

To add a country, supply its content slots and controller, reuse the card and subdivision-heading helpers, then test selection, search, view restoration, language switching, and releasing geometry when leaving the country. Keep country data fetching separate from layout creation so opening one country does not load another country's geometry or statistics.
