import {countryPageMarkup} from './country-page.mjs';
export const mongoliaPanel=`<aside id="mongolia-sidebar" class="sidebar mongolia-sidebar" hidden aria-label="Explore Mongolia" data-country-page>${countryPageMarkup({
 prefix:`m-`,
 search:{
 id:`m-search`,
 label:`Find a place`,
 placeholder:`Find a place · Газар хайх`,
 resultsId:`m-search-results`,
 disabled:true,
 dataNav:true
},
 settings:`<label class="field-label" for="m-province">Region</label><select id="m-province" data-nav disabled><option value="">All Mongolia</option></select><section class="layers"><h3>Visible layers</h3><label><span><i class="line province-line"></i>Provinces &amp; capital</span><input id="m-province-layer" type="checkbox" checked data-nav disabled></label><label><span><i class="line prefecture-line"></i>Districts</span><input id="m-district-layer" type="checkbox" checked data-nav disabled></label><label><span><i class="label-icon">Aa</i>Region names</span><input id="m-label-layer" type="checkbox" checked data-nav disabled></label></section>`,
 heading:{
 navigation:`<button id="m-selection-reset" class="back-button" data-nav>All Mongolia</button><img src="vendor/flag-mn.svg" width="40" height="30" alt="Flag of Mongolia">`,
 kindId:`m-selection-kind`,
 nameId:`m-selection-name`,
 nameLang:`en`,
 names:`<p id="m-selection-local" lang="mn-Cyrl" class="mongolian-name"></p><div id="m-traditional" class="regional-names" hidden><span class="name-caption">Mongolian script</span><p id="m-traditional-name" class="regional-text" lang="mn-Mong" data-vertical="true"></p></div>`
},
 cards:`<div id="m-selection-meta" class="country-card-anchor" hidden></div><section id="m-population" class="population" hidden><h3>Population</h3><p id="m-population-total" class="population-total"></p><p id="m-population-scope" class="population-scope"></p><p id="m-population-date" class="population-period"></p><a id="m-population-source" target="_blank" rel="noopener">Wikipedia: population data</a></section>`,
 subdivisions:`<details id="m-subdivisions" open><summary>Districts</summary><div id="m-region-list"></div></details>`,
 actions:`<div id="m-parent-context" class="parent-context" hidden><span id="m-parent-kind" class="name-caption">Province</span><button id="m-parent-region" class="quiet-button" data-nav><span id="m-parent-english"></span><span id="m-parent-local" lang="mn-Cyrl"></span></button></div>`,
 footer:`<button id="m-about-open">Sources &amp; coverage</button><span class="creator-credit">Created by Ethan Hu</span>`,
 extraPanels:``,
 afterPanels:``
})}</aside>
 <dialog id="m-about"><div class="dialog-head"><button id="m-about-close" aria-label="Close sources">×</button></div><h2>Sources and coverage</h2><p>Mongolia's province and district boundaries use the <a href="https://data.humdata.org/dataset/cod-ab-mng" target="_blank" rel="noopener">National Statistical Office / OCHA dataset</a>, under <a href="https://creativecommons.org/licenses/by/3.0/igo/" target="_blank" rel="noopener">CC BY-IGO</a>. Provinces are assembled from their districts, including Ulaanbaatar's nine districts. The shared China–Mongolia edge uses the same coordinates on both sides.</p><p><a href="data/mongolia-sources.json" target="_blank" rel="noopener">Boundary sources and processing</a> · <a href="data/mongolia-border-report.json" target="_blank" rel="noopener">Shared-border checks</a></p><p>Province populations use the 2020 Census column of <a href="https://en.wikipedia.org/wiki/Provinces_of_Mongolia" target="_blank" rel="noopener">Wikipedia's Provinces of Mongolia table</a>. The source revision and census dates are retained.</p><p><a href="data/province-population.json" target="_blank" rel="noopener">Population data and sources</a></p></dialog>`;
