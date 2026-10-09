// Small vector emblems; each country animates only its moving parts.
window.AtlasSymbols={sequence:0,markup(country){
 if(country==='russia'){
  const key='matryoshka-'+(++this.sequence);
  const face='<circle cx="60" cy="30" r="9" fill="#fff2da"/><path d="M52 26q8-10 16 0q-8-4-16 0" fill="#d4a258" stroke="none"/><g fill="#49352e" stroke="none"><circle cx="56.5" cy="30" r="1.1"/><circle cx="63.5" cy="30" r="1.1"/></g><path d="M57 35q3 2.5 6 0" fill="none" stroke="#9b4944" stroke-width="1.3" stroke-linecap="round"/>';
  const cap='<path d="M40 60c2-9 11-10 11-16 0-4-5-6-5-14 0-19 28-19 28 0 0 8-5 10-5 14 0 6 9 7 11 16Z"/>';
  const base='<path d="M40 60h40c7 11 12 22 5 30-6 8-44 8-50 0-7-8-2-19 5-30Z"/>';
  const apron='<ellipse cx="60" cy="78" rx="14" ry="12" fill="#fff2da" stroke="none"/><g fill="#d4a258" stroke="none"><path d="M60 69l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"/><circle cx="60" cy="78" r="3" fill="#b7444c"/></g>';
  // The fixed opening clips the moving child before the front shell is drawn.
  return `<svg class="country-symbol matryoshka" viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="${key}-opening" clipPathUnits="userSpaceOnUse"><rect width="100" height="60"/></clipPath></defs><ellipse cx="60" cy="97" rx="25" ry="2" fill="#29334a" opacity=".1"/><ellipse cx="60" cy="60" rx="20" ry="3" fill="#803239"/><g clip-path="url(#${key}-opening)"><g class="matryoshka-child"><g transform="translate(25.2 37.24)scale(.58)" fill="#365d9b" stroke="#254675" stroke-width="1.8" stroke-linejoin="round">${base}${apron}${cap}${face}</g></g></g><g fill="#b7444c" stroke="#803239" stroke-width="1.8" stroke-linejoin="round">${base}${apron}<g class="matryoshka-lid">${cap}${face}<path d="M56 42l4 4 4-4-4 10Z" fill="#fff2da" stroke="none"/></g></g></svg>`;
 }
 if(country==='philippines'){
  // Exact sun geometry from the national flag SVG; source in symbol-sources.
  const ray='m0 0-3.164-15.909.945-.946zl-1.169-17.831L0-19l1.169 1.169zl2.219-16.855.945.946z';
  return `<svg class="country-symbol philippines-sun" viewBox="-20 -20 40 40" aria-hidden="true"><g class="symbol-rotor" fill="#fcd116"><circle r="9"/>${Array.from({length:8},(_,i)=>`<path data-sun-ray="${i}" d="${ray}" transform="rotate(${i*45})"/>`).join('')}</g></svg>`;
 }
 // Exact emblems extracted by scripts/prepare-country-symbols.mjs.
 if(['argentina','brazil','uruguay'].includes(country))return `<img class="country-symbol symbol-rotor" src="vendor/${country==='brazil'?'brazil-globe':country+'-sun'}.svg" alt="" aria-hidden="true">`;
 if(['indonesia','malaysia','singapore'].includes(country))return `<svg class="country-symbol" viewBox="0 0 100 100" aria-hidden="true"><g class="symbol-rotor" fill="none" stroke="currentColor" stroke-width="3"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="40" stroke-width="1.5"/><path d="M50 10V90M10 50H90M22 22L78 78M22 78L78 22M34.7 13L65.3 87M13 34.7L87 65.3M13 65.3L87 34.7M34.7 87L65.3 13"/><circle cx="50" cy="50" r="8" fill="var(--map)"/></g></svg>`;
 if(country==='japan')return '<img class="country-symbol symbol-rotor" src="vendor/japan-chrysanthemum.png" alt="" aria-hidden="true">';
 const key='emblem-'+(++this.sequence);
 const taiji='<circle cx="50" cy="50" r="49" fill="#fff" stroke="#171717" stroke-width="1"/><path d="M50 1a49 49 0 0 1 0 98 24.5 24.5 0 0 1 0-49 24.5 24.5 0 0 0 0-49" fill="#171717"/><circle cx="50" cy="25.5" r="7" fill="#171717"/><circle cx="50" cy="74.5" r="7" fill="#fff"/>';
 const taegeuk='<circle cx="50" cy="50" r="49" fill="#0047a0"/><path d="M1 50a49 49 0 0 1 98 0 24.5 24.5 0 0 1-49 0 24.5 24.5 0 0 0-49 0" fill="#cd2e3a"/>';
 if(country!=='mongolia')return `<svg class="country-symbol" viewBox="0 0 100 100" aria-hidden="true"><g class="symbol-rotor">${country==='korea'?taegeuk:taiji}</g></svg>`;
 // The outer Soyombo follows the existing flag asset. Its central fish turn
 // together inside a fixed circular enclosure; the flame and pillars stay still.
 return `<svg class="country-symbol soyombo" viewBox="18 68 177 344" aria-hidden="true" fill="#c29a37">
 <defs><mask id="${key}-moon"><rect x="60" y="135" width="94" height="90" fill="white"/><circle cx="106.7" cy="163.6" r="43.6" fill="black"/></mask><mask id="${key}-fish" maskUnits="userSpaceOnUse" x="0" y="0" width="72.8" height="72.8"><circle cx="36.4" cy="36.4" r="36.4" fill="white"/><g fill="black" transform="translate(-109.05 -247.2)scale(.72727)"><circle cx="200" cy="363.5" r="10"/><circle cx="200" cy="416.5" r="10"/><path d="M200 334a29.5 29.5 0 0 1 0 59 23.5 23.5 0 0 0 0 47v6a29.5 29.5 0 0 1 0-59 23.5 23.5 0 0 0 0-47z"/></g></mask></defs>
 <circle cx="106.7" cy="181.8" r="40" mask="url(#${key}-moon)"/><circle cx="106.7" cy="170.9" r="29.1"/>
 <path d="M109.7 76.4a9 9 0 0 0-5.2 7.5c-.2 2.5.9 5.3 1 7.7 0 4.2-4.3 5.6-4.3 11.5 0 2 1.9 4.3 1.9 9.6-.4 2.8-2 3.5-3.7 3.7a3.6 3.6 0 0 1-3.6-3.7 4 4 0 0 1 1-2.5l.4-.3c.8-.9 2-1.2 2-3.4 0-1.1-.8-2.2-1.5-4.2s-.2-5.2 1.4-7.1c-2.6 1-4.1 3.4-5 5.6-.8 2.7 0 4.2-1.2 6.5-.7 1.4-1.5 2-2.3 3.2-1 1.4-2 4.4-2 5.9a18.2 18.2 0 0 0 36.3 0c0-1.5-1.1-4.5-2-5.9-.9-1.2-1.7-1.8-2.4-3.2-1.2-2.3-.4-3.8-1.3-6.5-.8-2.2-2.3-4.6-4.9-5.6 1.6 2 2 5.2 1.4 7.1-.7 2-1.4 3-1.4 4.2 0 2.2 1.1 2.5 2 3.4l.3.3a4 4 0 0 1 1 2.5 3.6 3.6 0 0 1-3.6 3.7c-2-.3-3.5-1.2-3.7-3.7 0-7 3-7.4 3-12.6 0-7.4-6.6-10.9-6.6-16.3 0-1.8.4-5 3-7.4M26.7 229H63v174.5H26.7Zm123.6 0h36.4v174.5h-36.4zm-80 0H143l-36.3 21.8Zm0 29H143v14.6H70.3Zm0 101.9H143v14.6H70.3Zm0 21.8H143l-36.3 21.8Z"/>
 <g transform="translate(70.3 280)"><g class="symbol-rotor"><circle cx="36.4" cy="36.4" r="36.4" mask="url(#${key}-fish)"/></g></g></svg>`;
}};
