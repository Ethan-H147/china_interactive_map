// Small vector emblems; CSS rotates only the group marked as the rotor.
window.AtlasSymbols={sequence:0,markup(country){
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
