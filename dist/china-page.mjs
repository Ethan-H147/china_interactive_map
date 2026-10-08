import {createCountryPage} from './country-page.mjs';
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
 actions:`<div class="place-actions"><button id="save-place" class="quiet-button" data-nav aria-pressed="false">Save place</button><button id="compare-place" class="quiet-button" data-nav hidden>Compare</button><button id="copy-place" class="quiet-button" data-nav>Copy link</button></div><p id="place-action-status" class="quiz-note" role="status" hidden></p><input id="place-share-link" aria-label="Place link" readonly hidden><nav id="region-articles" class="region-articles" aria-label="Wikipedia articles" hidden></nav><section id="landmark-gallery" class="landmark-gallery" aria-label="Landmark photos" hidden></section><div id="parent-context" class="parent-context" hidden><span class="name-caption" id="parent-kind"></span><button id="parent-region" class="quiet-button" data-nav hidden><span id="parent-english" lang="en"></span><span id="parent-chinese" lang="zh"></span></button></div>`,
 footer:`<button id="compare-open" data-nav disabled>Compare regions</button><button id="about-open">Sources & coverage</button><span class="creator-credit">Created by Ethan Hu</span>`,
 extraTabs:`<button id="tab-quiz" aria-pressed="false">Quiz</button>`,
 extraPanels:`<section id="quiz-panel" hidden aria-labelledby="quiz-title">
        <div id="quiz-setup">
          <span class="eyebrow">MAP QUIZ</span><h2 id="quiz-title">Find the prefecture</h2>
          <label class="field-label" for="quiz-type">Quiz type</label><select id="quiz-type" data-quiz-nav disabled><option value="find">Find on the map</option><option value="name">Name every prefecture</option></select><p id="quiz-description">Click the named place on the map.</p>
          <label class="field-label" for="quiz-scope">Scope</label><select id="quiz-scope" data-quiz-nav disabled><option value="">All China</option></select>
          <label class="quiz-toggle" id="quiz-taiwan-option"><span>Include Taiwan</span><input id="quiz-taiwan" type="checkbox" checked data-quiz-nav disabled></label>
          <p id="quiz-scope-note" class="quiz-note"></p>
          <label id="quiz-length-label" class="field-label" for="quiz-length">Questions</label><select id="quiz-length" data-quiz-nav disabled><option value="10">10 places</option><option value="20">20 places</option><option value="all">All places</option></select>
          <p id="quiz-count" class="quiz-note" aria-live="polite">Loading places…</p>
          <button id="quiz-start" class="quiz-primary" data-quiz-nav disabled>Start quiz</button><button id="quiz-resume" class="quiz-text-button" data-quiz-nav hidden>Resume saved round</button><p id="quiz-best" class="quiz-note" hidden></p>
        </div>
        <section id="quiz-naming" hidden aria-label="Name every prefecture">
          <h2 id="name-scope"></h2><div class="quiz-progress"><span id="name-progress"></span><span id="name-timer" aria-label="Elapsed time">0:00</span></div>
          <div class="quiz-progress-track"><div id="name-progress-bar"></div></div>
          <form id="name-form" autocomplete="off"><label class="field-label" for="name-answer">Prefecture name</label><div class="name-entry"><input id="name-answer" placeholder="English or Chinese" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="160"><button class="quiz-primary" type="submit">Add</button></div></form>
          <p id="name-feedback" role="status" aria-live="polite"></p>
          <div id="name-live-actions" class="name-actions"><button id="name-hint" class="quiet-button" data-quiz-nav>Give me a hint</button><button id="name-finish" class="quiet-button" data-quiz-nav>Finish &amp; reveal</button><button id="name-pause" class="quiz-text-button" data-quiz-nav>Save &amp; exit</button></div>
          <div id="name-results" hidden><h3 id="name-result-title" tabindex="-1"></h3><p id="name-summary"></p><p class="quiz-note">Green: named. Red: not named.</p><button id="name-practice" class="quiz-primary" data-quiz-nav>Practice missed places</button><button id="name-change" class="quiz-text-button" data-quiz-nav>Choose another province</button></div>
          <p id="name-save-note" class="quiz-note"></p><h3 id="name-list-title" class="name-list-title">Named places</h3><div id="name-list" class="name-list"></div>
        </section>
        <section id="quiz-round" hidden aria-label="Current question">
          <div class="quiz-progress"><span id="quiz-progress-text"></span><span id="quiz-score"></span></div>
          <div class="quiz-progress-track" aria-hidden="true"><div id="quiz-progress-bar"></div></div>
          <p class="quiz-instruction">Find on the map</p><h2 id="quiz-question" tabindex="-1"></h2><p id="quiz-question-chinese" lang="zh"></p>
          <div id="quiz-feedback" class="quiz-feedback" role="status" aria-live="polite" hidden><strong id="quiz-feedback-title"></strong><p id="quiz-feedback-detail"></p></div>
          <div class="quiz-round-actions"><button id="quiz-reveal" class="quiet-button" data-quiz-nav>Show answer</button><button id="quiz-view" class="quiet-button" data-quiz-nav hidden>View answer</button><button id="quiz-next" class="quiz-primary" data-quiz-nav hidden>Next question</button></div>
          <button id="quiz-end" class="quiz-text-button" data-quiz-nav>End quiz</button>
        </section>
        <section id="quiz-results" hidden aria-labelledby="quiz-results-title">
          <span class="eyebrow">QUIZ COMPLETE</span><h2 id="quiz-results-title" tabindex="-1">Results</h2><p id="quiz-result-score" class="quiz-result-score"></p><p id="quiz-result-detail"></p>
          <div id="quiz-review" class="quiz-review"></div>
          <button id="quiz-again" class="quiz-primary" data-quiz-nav>Play again</button><button id="quiz-configure" class="quiz-text-button" data-quiz-nav>Change scope</button>
        </section>
      </section>`,
 afterPanels:``,
 selectionId:`selection`,
 selectionHidden:true,
 beforeSelection:`<div id="welcome" hidden><h2>Featured regions</h2><div id="discovery-cards" class="discovery-cards"></div></div>`,
 id:`china-sidebar`,
 label:`Explore China`,
 hidden:false
});
 document.querySelector('.workspace').insertBefore(page,document.getElementById('map-shell'));return page;
}
