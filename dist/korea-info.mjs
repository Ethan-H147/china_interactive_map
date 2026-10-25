const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Modern Hangul inventory and RR/MR spellings; context-dependent forms are explained in the article.
export const koreanVowels=[
 ['ㅏ','a','a','[a]'],['ㅐ','ae','ae','[ɛ ~ e]'],['ㅑ','ya','ya','[ja]'],['ㅒ','yae','yae','[jɛ ~ je]'],
 ['ㅓ','eo','ŏ','[ʌ]'],['ㅔ','e','e','[e]'],['ㅕ','yeo','yŏ','[jʌ]'],['ㅖ','ye','ye','[je ~ e]'],
 ['ㅗ','o','o','[o]'],['ㅘ','wa','wa','[wa]'],['ㅙ','wae','wae','[wɛ ~ we]'],['ㅚ','oe','oe','[ø ~ we]'],
 ['ㅛ','yo','yo','[jo]'],['ㅜ','u','u','[u]'],['ㅝ','wo','wŏ','[wʌ]'],['ㅞ','we','we','[we]'],
 ['ㅟ','wi','wi','[y ~ wi]'],['ㅠ','yu','yu','[ju]'],['ㅡ','eu','ŭ','[ɯ]'],['ㅢ','ui','ŭi','[ɰi]; [i] or [e] by context'],['ㅣ','i','i','[i]']
];
export const koreanConsonants=[
 ['ㄱ','g / k','k / g','Plain velar stop; often voiced between voiced sounds.'],
 ['ㄲ','kk','kk','Tense velar stop.'],['ㄴ','n','n','Alveolar nasal; see initial-sound changes below.'],
 ['ㄷ','d / t','t / d','Plain alveolar stop.'],['ㄸ','tt','tt','Tense alveolar stop.'],
 ['ㄹ','r / l','r / l / n','A tap or an l sound, depending on position; sometimes omitted word-initially in MR.'],
 ['ㅁ','m','m','Bilabial nasal.'],['ㅂ','b / p','p / b','Plain bilabial stop.'],['ㅃ','pp','pp','Tense bilabial stop.'],
 ['ㅅ','s','s / sh','Fricative; sounds sh-like before i and y sounds.'],['ㅆ','ss','ss / ssh','Tense counterpart of ㅅ.'],
 ['ㅇ','— / ng','— / ng','Silent at the start of a syllable; [ŋ] at the end.'],
 ['ㅈ','j','ch / j','Plain affricate. MR often uses j in a voiced environment.'],['ㅉ','jj','tch','Tense affricate.'],
 ['ㅊ','ch','ch′','Aspirated affricate.'],['ㅋ','k','k′','Aspirated velar stop.'],['ㅌ','t','t′','Aspirated alveolar stop.'],
 ['ㅍ','p','p′','Aspirated bilabial stop.'],['ㅎ','h','h','Glottal fricative; can disappear or affect the following consonant.']
];
export const koreanFinals=[
 ['ㄱ ㄲ ㅋ','[k̚]','k','No audible release.'],['ㄴ','[n]','n','Nasal.'],
 ['ㄷ ㅅ ㅆ ㅈ ㅊ ㅌ ㅎ','[t̚]','t','Neutralized final stop; ㅎ usually interacts with the following sound.'],
 ['ㄹ','[l]','l','Lateral.'],['ㅁ','[m]','m','Nasal.'],['ㅂ ㅍ','[p̚]','p','No audible release.'],['ㅇ','[ŋ]','ng','The ng sound, with no following g stop.']
];
export const koreanClusters=[
 ['ㄳ','k','넋 → [넉]','The ㅅ is normally dropped before a pause or another consonant.'],
 ['ㄵ','n','앉다 → [안따]','The ㅈ is normally dropped in this environment.'],
 ['ㄶ','n','많다 → [만타]','The ㅎ can aspirate a following consonant, or disappear before a vowel.'],
 ['ㄺ','k, sometimes l','닭 → [닥]; 읽고 → [일꼬]','Context matters: the ㄹ can remain before ㄱ in verb forms.'],
 ['ㄻ','m','삶 → [삼]','The ㅁ remains.'],['ㄼ','l, sometimes p','여덟 → [여덜]; 밟다 → [밥따]','밟- and some 넓- compounds use p.'],
 ['ㄽ','l','곬 → [골]','The ㅅ is normally dropped.'],['ㄾ','l','핥다 → [할따]','The ㅌ is normally dropped before another consonant.'],
 ['ㄿ','p','읊다 → [읍따]','The remaining ㅍ closes as p.'],['ㅀ','l','싫다 → [실타]','The ㅎ can aspirate a following consonant, or disappear before a vowel.'],
 ['ㅄ','p','값 → [갑]','The ㅅ is normally dropped before a pause or another consonant.']
];
const sources={
 rr:'https://www.korean.go.kr/front_eng/roman/roman_01.do',
 mr:'https://geonames.nga.mil/geonames/GNSSearch/GNSDocs/romanization/ROMANIZATION_OF_KOREAN-_MR_for_DPRK.pdf',
 systems:'https://arhiiv.eki.ee/wgrs/v2_2/rom2_ko.htm',
 hangul:'https://m.korean.go.kr/eng_hangeul/principle/001.html',
 vowels:'https://www.korean.go.kr/front/page/pageView.do?mn_id=95&page_id=P000098',
 finals:'https://www.korean.go.kr/front/page/pageView.do?mn_id=95&page_id=P000100',
 clusters:'https://www.korean.go.kr/nkview/nknews/199904/9_5.htm',
 loc:'https://wwws.loc.gov/catdir/cpso/romanization/korean.pdf'
};
const link=(key,label)=>`<a href="${sources[key]}" target="_blank" rel="noopener">${label}</a>`;
function table(id,caption,headers,rows){return `<div class="korean-table-wrap" tabindex="0" role="region" aria-label="${escape(caption)}"><table id="${id}"><caption>${escape(caption)}</caption><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map((cell,i)=>i===0?`<th scope="row" lang="ko">${escape(cell)}</th>`:`<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}
export const koreaInfoPanel=`<section id="k-extra-panel" hidden aria-label="Extra info"><button id="k-romanization-open" class="korean-article-link" type="button" aria-haspopup="dialog" aria-controls="k-romanization"><strong>Korean romanization</strong><span>Gangwon, Kangwŏn, and Kangwon: Korean spelling systems and sound tables.</span></button></section>`;
export const koreaRomanizationDialog=`<dialog id="k-romanization" class="korean-reader" aria-labelledby="k-romanization-title"><header class="korean-reader-header"><h2 id="k-romanization-title">Korean romanization</h2><button id="k-romanization-close" type="button" aria-label="Close romanization article" autofocus>×</button></header><article class="korean-reader-body" tabindex="-1">
<p class="korean-article-lead">Gangwon and Kangwŏn both represent 강원. Their spellings follow different rules for writing Korean in the Latin alphabet.</p>
<nav class="korean-article-contents" aria-label="Article sections">${[['systems','The systems'],['vowels','Vowels'],['consonants','Consonants'],['finals','Final sounds'],['changes','Sound changes'],['names','Place names'],['sources','Sources']].map(([id,label])=>`<button type="button" data-korean-section="${id}">${label}</button>`).join('')}</nav>
<section id="korean-systems" aria-labelledby="korean-systems-title"><h3 id="korean-systems-title">Why spellings differ</h3>
<p><strong>Romanization</strong> writes Korean in Latin letters. The two main systems give 부산 the spellings Busan and Pusan.</p>
<p><strong>Revised Romanization (RR)</strong> is South Korea’s national system, adopted in 2000. It writes ㅓ as <i>eo</i> and ㅡ as <i>eu</i>. RR writes initial ㄱ, ㄷ, and ㅂ as <i>g, d, b</i>. Examples include Gyeonggi, Daegu, and Busan. RR follows standard pronunciation and retains certain spelling distinctions, including <i>ui</i> for ㅢ. ${link('rr','Official RR rules')}.</p>
<p><strong>McCune–Reischauer (MR)</strong>, developed in 1939, uses breves in <i>ŏ</i> and <i>ŭ</i> and apostrophes to mark aspiration. It writes the same names Kyŏnggi, Taegu, and Pusan. MR remains common in older maps and books. International BGN/PCGN guidance applies a modified MR system to North Korean geographical names. The Library of Congress uses MR with its own cataloguing conventions. ${link('mr','BGN/PCGN geographical-name rules')}; ${link('loc','Library of Congress conventions')}.</p>
<p><strong>North Korea’s national convention</strong> writes aspirated ㅋ, ㅌ, and ㅍ as <i>kh, th, ph</i>; MR uses <i>k′, t′, p′</i>. The tables below compare RR with the MR forms used in BGN/PCGN geographical-name guidance. ${link('systems','UNGEGN comparison of the systems')}.</p>
<p>English publications also use spellings with the marks removed: <i>P’yŏngyang</i> becomes <i>Pyongyang</i>, and <i>Kangwŏn</i> becomes <i>Kangwon</i>. In full MR spelling, breves distinguish <i>ŏ</i> from <i>o</i> and <i>ŭ</i> from <i>u</i>. Apostrophes distinguish aspirated consonants such as <i>p′</i> from their plain counterparts.</p>
</section>
<section id="korean-reading" aria-labelledby="korean-reading-title"><h3 id="korean-reading-title">How to read the tables</h3>
<p>Hangul letters form syllable blocks. 강 contains ㄱ + ㅏ + ㅇ: an initial consonant, a vowel, and a final consonant. Initial ㅇ is a silent placeholder; final ㅇ is <i>ng</i>. Modern Hangul has 19 initial consonant letters, 21 vowel letters, and 27 written final consonants, including clusters. Position and dialect affect how these letters are pronounced. ${link('hangul','Hangul syllable structure')}.</p>
<p>The RR and MR columns give the romanized spellings. Slashes separate contextual alternatives. Square brackets show pronunciation: IPA in the vowel and final-sound tables, and Hangul in the example readings. These IPA values give broad pronunciations; accents vary. A tilde (~) separates alternative pronunciations.</p>
</section>
<section id="korean-vowels" aria-labelledby="korean-vowels-title"><h3 id="korean-vowels-title">All 21 vowel letters</h3>
${table('korean-vowel-table','Vowels: Hangul, RR, MR, and broad pronunciation',['Hangul','RR','MR','Sound (IPA)'],koreanVowels)}
<p><i>Eo</i> represents the single vowel [ʌ]. <i>Eu</i> represents [ɯ], pronounced with the tongue high and back and the lips unrounded. The <i>y</i> in <i>ya</i> represents the glide [j]. IPA [y], shown for one pronunciation of ㅟ, denotes a rounded high front vowel.</p>
<p>ㅐ and ㅔ can sound alike in present-day speech; their romanized forms remain <i>ae</i> and <i>e</i>. ㅚ and ㅟ have both single-vowel and glide pronunciations. ㅢ is pronounced [i] after a consonant within the same syllable, as in 희. The particle 의 also allows [e]. RR retains <i>ui</i> for ㅢ; MR allows contextual forms such as <i>i</i>. MR also uses <i>e</i> for ㅖ in certain contexts. After an affricate, ㅕ loses its y glide in forms such as 쳐 [처]. ${link('vowels','Standard vowel pronunciation')}; ${link('rr','RR vowel spellings')}; ${link('mr','MR vowel tables and contextual forms')}.</p>
</section>
<section id="korean-consonants" aria-labelledby="korean-consonants-title"><h3 id="korean-consonants-title">All 19 initial consonants</h3>
${table('korean-consonant-table','Consonants: normal RR and MR values',['Hangul','RR','MR','Sound and context'],koreanConsonants)}
<p>Korean stops and affricates have three series: <strong>plain</strong>, <strong>aspirated</strong>, and <strong>tense</strong>. The plain series contains ㄱ ㄷ ㅂ ㅈ; the aspirated series contains ㅋ ㅌ ㅍ ㅊ. The tense series contains ㄲ ㄸ ㅃ ㅉ. ㅅ and ㅆ also form a plain–tense pair. Aspirated consonants have a stronger puff of air. Tense consonants use a tighter articulation; doubled Latin letters mark this series in RR.</p>
<p>RR’s initial <i>g</i> in Gangwon and MR’s initial <i>k</i> in Kangwŏn both represent ㄱ. In voiced environments, MR uses <i>g, d, b</i> for the plain stops. A single ㄹ between vowels is a brief tap [ɾ]; word-final ㄹ is [l]. ㅅ sounds sh-like before i and y sounds; 시 is written <i>si</i> in both RR and MR. ${link('mr','MR consonant and combination tables')}.</p>
</section>
<section id="korean-finals" aria-labelledby="korean-finals-title"><h3 id="korean-finals-title">Final consonants: 27 spellings, seven closing sounds</h3>
<p>A syllable-final consonant is called <i>batchim</i> (받침). Before a pause, the written finals reduce to seven closing sounds. The symbols [k̚], [t̚], and [p̚] mark stops with an inaudible release.</p>
${table('korean-final-table','The 16 single final letters, grouped by closing sound',['Written final','Sound (IPA)','RR / MR','Condition'],koreanFinals)}
<p>Final ㅅ, ㅈ, and ㅊ close as <i>t</i>: 빗, 빚, and 빛 have the same isolated final sound. Before a vowel-initial ending, the consonant moves into the next syllable’s onset. The three forms then have different consonant sounds: 빗이 [비시], 빚이 [비지], and 빛이 [비치]. ${link('finals','Standard Korean pronunciation rules')}.</p>
${table('korean-cluster-table','All 11 compound final consonants',['Cluster','Usual closing value','Example reading','Context'],koreanClusters)}
<p>These cluster readings apply before a pause or another consonant. With a vowel-initial ending, a cluster can split: 닭이 is pronounced [달기]. The ㅎ in ㄶ or ㅀ can aspirate a following consonant or disappear before a vowel. ${link('clusters','Explanation of final-consonant reduction')}.</p>
</section>
<section id="korean-changes" aria-labelledby="korean-changes-title"><h3 id="korean-changes-title">Sound changes between syllables</h3>
<p><strong>Liaison.</strong> A final consonant can move into the next syllable when a vowel-initial ending follows. In the place name 백암, the ㄱ links to 암, giving RR Baegam.</p>
<p><strong>Nasal assimilation.</strong> Stops change before nasal sounds. 백마 is pronounced [뱅마], giving RR Baengma. After ㅇ, ㄹ becomes n: 종로 [종노] gives Jongno in RR and Chongno in MR.</p>
<p><strong>Liquid assimilation.</strong> Adjacent ㄴ and ㄹ can become a double l sound, as in 신라 [실라], RR Silla.</p>
<p><strong>Palatalization and aspiration.</strong> ㄷ or ㅌ before an i sound can become an affricate: 같이 [가치] is RR gachi. Adjacent ㅎ can turn a plain consonant into an aspirated one: 좋고 [조코] is RR joko. In nouns such as 묵호, RR retains the written h: Mukho.</p>
<p><strong>Tenseness and inserted sounds.</strong> Speech can strengthen a consonant or insert an n/l sound between parts of a word. RR preserves the plain spelling in compounds such as 압구정, Apgujeong, where speech has a tense consonant. An inserted n appears in 학여울 [항녀울], RR Hangnyeoul. ${link('rr','RR sound-change rules and examples')}.</p>

</section>
<section id="korean-names" aria-labelledby="korean-names-title"><h3 id="korean-names-title">What changes in place names</h3>
${table('korean-place-table','The same place name under RR and MR',['Hangul','RR','MR','Common plain spelling'],[
 ['강원','Gangwon','Kangwŏn','Kangwon'],['부산','Busan','Pusan','Pusan'],['대구','Daegu','Taegu','Taegu'],['경기','Gyeonggi','Kyŏnggi','Kyonggi'],['인천','Incheon','Inch′ŏn','Inchon'],['평양','Pyeongyang','P′yŏngyang','Pyongyang'],['개성','Gaeseong','Kaesŏng','Kaesong'],['청진','Cheongjin','Ch′ŏngjin','Chongjin']])}
<p><strong>Province names and abbreviations.</strong> In 충청북도, 북 means north and 도 means province. English uses both Chungcheongbuk-do and North Chungcheong. Chungbuk is the shortened Korean name 충북. Chungnam, Gyeongbuk, and Gyeongnam correspond to South Chungcheong, North Gyeongsang, and South Gyeongsang. Jeonbuk is the shortened form of Jeollabuk, also known in English as North Jeolla.</p>
<p><strong>Administrative endings.</strong> RR uses <i>-do</i> for provinces and <i>-si</i> for cities. Counties take <i>-gun</i>; districts take <i>-gu</i>. In MR, the preceding sound affects the ending: compare Kangwŏn-do and P′yŏngt′aek-kun. Publications also differ in where they place hyphens. ${link('rr','RR administrative-name rules')}; ${link('loc','MR jurisdiction examples')}.</p>
<p><strong>North–South spelling differences.</strong> Some Sino-Korean words retain initial ㄹ or ㄴ in northern spelling, while southern spelling changes or removes it. Examples include 룡 / 용 and 녀 / 여. This initial-sound convention produces pairs such as Ryanggang/Yanggang and Ryeokpo/Yeokpo. Northern 량강 gives RR Ryanggang; southern 양강 gives Yanggang. ${link('loc','Initial ㄴ and ㄹ conventions')}.</p>
<p><strong>Names shared by different places.</strong> Gangwon/Kangwŏn names provinces on both sides of the border. Goseong/Kosŏng also occurs in several locations. Search results show the country or parent region beside each place.</p>
<p><strong>In this atlas.</strong> Search and typing quizzes accept RR and MR spellings, short province names, and North–South initial-sound variants. Accents, apostrophes, spaces, and hyphens are optional when entering a name.</p>
</section>
<section id="korean-sources" aria-labelledby="korean-sources-title"><h3 id="korean-sources-title">Sources and further reading</h3><ul>
<li>${link('rr','National Institute of Korean Language: Revised Romanization')} — letter values, sound changes, and administrative endings.</li>
<li>${link('mr','U.S. Board on Geographic Names / PCGN: MR for North Korean geographical names')} — consonants, vowels, and contextual tables.</li>
<li>${link('systems','UNGEGN Working Group: comparison of Korean romanization systems')} — the RR, MR, and DPRK national systems.</li>
<li>${link('hangul','National Institute of Korean Language: Hangul structure')} — the modern initial, vowel, and final inventories.</li>
<li>${link('finals','National Institute of Korean Language: standard pronunciation')} and ${link('clusters','explanation of final consonants')} — closing sounds and cluster reduction.</li>
<li>${link('loc','Library of Congress: Korean Romanization and Word Division')} — MR examples, jurisdiction endings, and initial-sound conventions.</li>
</ul></section>
</article></dialog>`;
export function wireKoreaInfo(){
 const dialog=document.getElementById('k-romanization'),body=dialog.querySelector('article');
 document.getElementById('k-romanization-open').onclick=()=>dialog.showModal();
 document.getElementById('k-romanization-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 for(const button of dialog.querySelectorAll('[data-korean-section]'))button.onclick=()=>{const section=document.getElementById('korean-'+button.dataset.koreanSection);section.scrollIntoView({block:'start',behavior:'instant'});section.querySelector('h3').tabIndex=-1;section.querySelector('h3').focus({preventScroll:true});};
 dialog.addEventListener('close',()=>{body.scrollTop=0;});
 return {close(){if(dialog.open)dialog.close();}};
}
