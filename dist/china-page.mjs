import {createCountryPage} from './country-page.mjs';
import {chinaInfoPanel,chinaRomanizationDialog,wireChinaInfo} from './china-info.mjs';
export {applyChinaSearchAliases,normalizeChinaSearch} from './china-search-aliases.mjs';
import {crossStraitLink,crossStraitDialog,wireCrossStraitInfo} from './cross-strait-info.mjs';
let crossStraitReader;
let infoReader;
export function closeChinaInfo(){infoReader?.close();crossStraitReader?.close();}
export function mountChinaPage(){
 const page=createCountryPage({
 prefix:``,
 search:{
 id:`search`,
 label:`Find a region`,
 placeholder:`Find a region`,
 resultsId:`search-results`,
 disabled:true,
 dataNav:true
},
 settings:`<label class="field-label" for="province">Region</label><select id="province" data-nav disabled><option value="">All China</option></select><section class="layers" aria-labelledby="layers-title"><h3 id="layers-title">Visible layers</h3><label><span><i class="line province-line"></i>Province outlines</span><input id="province-layer" type="checkbox" checked data-nav></label><label><span><i class="line prefecture-line"></i>Prefectures &amp; Taiwan divisions</span><input id="prefecture-layer" type="checkbox" checked data-nav></label><label><span><i class="line district-line"></i>Districts &amp; direct divisions</span><input id="other-layer" type="checkbox" checked data-nav></label><label><span><i class="label-icon">Aa</i>Region names</span><input id="label-layer" type="checkbox" checked data-nav></label><div id="satellite-controls"><label><span><i class="satellite-toggle-icon" aria-hidden="true"></i>Satellite imagery</span><input id="satellite-layer" type="checkbox" data-nav disabled aria-describedby="satellite-status"></label><div id="satellite-options" class="satellite-options" hidden><p><a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener">Esri World Imagery</a> · Detail and capture dates vary by location</p><label for="satellite-opacity">Imagery opacity <output id="satellite-opacity-value" for="satellite-opacity">100%</output></label><input id="satellite-opacity" type="range" min="0" max="100" step="5" value="100" data-nav></div><p id="satellite-status" role="status" hidden></p></div><label><span><i class="capital-toggle-icon" aria-hidden="true">★</i>Capitals</span><input id="capital-layer" type="checkbox" data-nav disabled></label><div id="capital-legend" class="capital-legend" hidden></div><label><span><i class="line water-line" aria-hidden="true"></i>Major rivers &amp; lakes</span><input id="water-layer" type="checkbox" data-nav disabled aria-describedby="water-status"></label><p id="water-status" role="status" hidden></p></section><details class="saved-places"><summary>Saved places</summary><div id="saved-places-list"></div></details>`,
 heading:{
 navigation:`<button id="selection-reset" class="back-button" data-nav>All China</button><img id="selection-flag" width="40" height="30" src="vendor/flag-prc.svg" alt="Flag of the People’s Republic of China">`,
 kindId:`selection-kind`,
 nameId:`selection-name`,
 nameLang:`en`,
 names:`<p id="selection-chinese" lang="zh"></p><div id="selection-regional" class="regional-names" hidden></div>`
},
 cards:`<div id="selection-meta" class="country-card-anchor" hidden></div><section id="population" class="population" aria-labelledby="population-heading" hidden>
  <h3 id="population-heading">Population</h3>
  <p class="population-total" id="population-total"></p>
  <p class="population-scope" id="population-scope">Entire administrative region</p>
  <p class="population-period"><span id="population-date"></span><span id="population-boundaries"> · 2020 boundaries</span></p>
  <dl class="population-breakdown" id="population-breakdown"><dt title="Residents in cities and towns (城镇人口)">Cities and towns</dt><dd id="population-towns"></dd><dt title="Residents in the urban core area (城区人口)">Urban core</dt><dd id="population-core"></dd></dl>
  <p id="population-quality" class="population-quality" hidden>The source’s population figures are inconsistent.</p>
  <a id="population-source" target="_blank" rel="noopener">Wikipedia: population data</a>
</section><section id="division-note" class="division-note" aria-label="Administrative details" hidden></section><article id="story" class="story" hidden><h3 id="story-title"></h3><p id="story-text"></p><a id="story-source" target="_blank" rel="noopener">UNESCO: site details</a></article>`,
 subdivisions:`<details id="subdivisions"><summary id="subdivisions-title">Subdivisions</summary><div id="region-list"></div></details>`,
 actions:`<div class="place-actions"><button id="save-place" class="quiet-button" data-nav aria-pressed="false">Save place</button><button id="compare-place" class="quiet-button" data-nav hidden>Compare</button><button id="copy-place" class="quiet-button" data-nav>Copy link</button></div><p id="place-action-status" class="quiz-note" role="status" hidden></p><input id="place-share-link" aria-label="Place link" readonly hidden><nav id="region-articles" class="region-articles" aria-label="Wikipedia articles" hidden></nav><section id="landmark-gallery" class="landmark-gallery" aria-label="Landmark photos" hidden></section>`,
 footer:`<button id="compare-open" data-nav disabled>Compare regions</button><button id="about-open">Sources & coverage</button><span class="creator-credit">Created by Ethan Hu</span>`,
 extraTabs:`<button id="tab-quiz" aria-pressed="false">Quiz</button><button id="tab-extra" aria-pressed="false">Extra info</button>`,
 extraPanels:`<section id="quiz-panel" hidden></section>`,
 afterPanels:chinaInfoPanel.replace('</section>',crossStraitLink+'</section>'),
 selectionId:`selection`,
 selectionHidden:true,
 beforeSelection:`<div id="welcome" hidden><h2>Featured regions</h2><div id="discovery-cards" class="discovery-cards"></div></div>`,
 id:`china-sidebar`,
 label:`Explore China`,
 hidden:false
});
 document.querySelector('.workspace').insertBefore(page,document.getElementById('map-shell'));
 document.body.insertAdjacentHTML('beforeend',chinaRomanizationDialog+crossStraitDialog);infoReader=wireChinaInfo();crossStraitReader=wireCrossStraitInfo();return page;
}
