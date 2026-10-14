import fs from 'node:fs';
import assert from 'node:assert/strict';

// Phones get a full-screen map with the sidebar as a bottom sheet; desktop is unchanged.
const css=fs.readFileSync('dist/mobile-sheet.css','utf8'),page=fs.readFileSync('dist/index.html','utf8');
const app=fs.readFileSync('dist/app.js','utf8'),loader=fs.readFileSync('dist/gpu-loader.js','utf8'),sheet=fs.readFileSync('dist/mobile-sheet.mjs','utf8');
// Every rule except hiding the handle lives inside the phone media queries.
const outside=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,'').trim();
assert.equal(outside,'.sheet-handle { display: none; }','Only the hidden handle is styled outside phone widths');
assert(css.includes('@media (max-width: 760px)'),'The sheet applies at the existing phone breakpoint');
// Loaded after every other stylesheet so it overrides country styles.
const links=[...page.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m=>m[1]);
assert.equal(links.at(-1),'mobile-sheet.css','The sheet stylesheet loads last');
assert(loader.includes("modules.AtlasSheet='mobile-sheet.mjs'"),'The sheet module loads with the other modules');
// Camera flights keep the selected region above the half-open sheet.
assert(app.includes('window.AtlasSheet?.navigationInset()'),'Navigation padding includes the sheet');
assert(sheet.includes("query.matches ? heights().half + 16 : 0"),'No extra padding on desktop');
// Every country's sidebar comes from country-page.mjs: tools, then scrolling content.
for(const file of ['dist/country-page.mjs'])for(const part of ['sidebar-tools','sidebar-scroll','sidebar-footer'])assert(fs.readFileSync(file,'utf8').includes(part),file+' has '+part);
console.log('Mobile sheet: phone-only styles, loaded last, shared sidebar structure, and flights clear of the sheet.');
