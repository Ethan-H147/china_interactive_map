import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'scripts/statistics-sources/south-africa-phone-codes');
const output = path.join(root, 'dist/data/southern-africa/south-africa/phone-codes.json');
const telkomURL = 'https://ecdev2.telkom.co.za/corporate/customer-support/utilities/useful_information/sa_codes.html';
const sapsURL = 'https://www.saps.gov.za/contacts/provdetails.php?pid=9SA';
const planURL = 'https://www.icasa.org.za/uploads/files/NumberingPlanReg.pdf';
const provinces = { 'ZA-GP':'Gauteng', 'ZA-WC':'Western Cape', 'ZA-EC':'Eastern Cape', 'ZA-KZN':'KwaZulu-Natal', 'ZA-LP':'Limpopo', 'ZA-MP':'Mpumalanga', 'ZA-NW':'North West', 'ZA-NC':'Northern Cape', 'ZA-FS':'Free State' };
const decode = s => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').trim();
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const valid = new Set(['010','011','012','013','014','015','016','017','018','021','022','023','027','028','031','032','033','034','035','036','039','040','041','042','043','044','045','046','047','048','049','051','053','054','056','057','058']);
const telkom = [];
for (const row of fs.readFileSync(path.join(sourceDir, 'telkom-sa-codes.html'), 'utf8').matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
  const cells = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map(x => decode(x[1]));
  if (cells.length !== 2 || !valid.has(cells[1])) continue;
  let name = cells[0], province;
  const qualifier = name.match(/\s*\(([^)]+)\)\s*$/);
  if (qualifier) {
    const map = {G:'Gauteng',M:'Mpumalanga',KZN:'KwaZulu-Natal','EC/OK':'Eastern Cape','WC/WK':'Western Cape','NC/NK':'Northern Cape','FS/VS':'Free State',NW:'North West',NP:'Limpopo'};
    province = map[qualifier[1]];
    name = name.replace(qualifier[0], '');
  }
  // The directory prints bilingual East/Oos and West/Wes entries together.
  name = name.replace(/\/-Oos$/, '').replace(/\/-Wes$/, '');
  telkom.push({name, province, code:cells[1], source:telkomURL});
}
const saps = [];
const html = fs.readFileSync(path.join(sourceDir, 'saps-contacts.html'), 'utf8');
for (const row of html.matchAll(/<li>\s*<a href="(stationdetails[^"]+)">([^<]+)<\/a>\s*\(<b>Phone:<\/b>(.*?)<b>E-mail:<\/b>/gs)) {
  const label = decode(row[2]), match = label.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (!match) continue;
  const codes = [...new Set([...decode(row[3]).matchAll(/\b(0\d{2})[\s-]*\d{3}[\s-]*\d{4}\b/g)].map(x=>x[1]).filter(x=>valid.has(x)))];
  const names = match[1].split(/\s*\/\s*/);
  // Administrative police qualifiers are not part of the settlement name.
  names.push(...names.map(n => n.replace(/\s+(?:Central|North|South|East|West)$/, '')));
  for (const name of new Set(names)) for (const code of codes) saps.push({name, province:match[2], code, source:new URL(decode(row[1]), 'https://www.saps.gov.za/contacts/').href});
}
const settlements = JSON.parse(fs.readFileSync(path.join(root, 'dist/data/southern-africa/south-africa/settlements.json'))).records;
const audited = JSON.parse(fs.readFileSync(path.join(sourceDir,'audited-localities.json'),'utf8'));
// Bilingual spellings of the same named Western Cape places, explicitly
// attested by the directory's police-station name/email pairing.
const directoryAliases = {'Kuils River':['Kuilsrivier'],'Elsies Rivier':['Elsies River'],'Eerste Rivier':['Eerste River']};
const records = {}, unmatched = [], conflicts = [];
for (const place of settlements) {
  const names = new Set([place.en, place.name, place.provenance?.censusName, ...(place.aliases || []),...(directoryAliases[place.en]||[])].filter(Boolean).map(norm));
  const province = provinces[place.provinceId];
  const direct = telkom.filter(x=>names.has(norm(x.name)) && (!x.province || norm(x.province) === norm(province)));
  const police = saps.filter(x=>names.has(norm(x.name)) && norm(x.province) === norm(province));
  const local = audited.filter(x=>names.has(norm(x.name)) && norm(x.province) === norm(province)).flatMap(x=>x.codes.map(code=>({...x,code})));
  let matches = direct.length ? direct : police.length ? police : local;
  const codes = [...new Set(matches.map(x=>x.code))].sort();
  // Same-name towns in different provinces, and contradictory directory entries,
  // must never receive a guessed area code. Johannesburg's overlay is legitimate.
  if (codes.length > 1 && !(codes.length === 2 && codes.join() === '010,011')) {
    conflicts.push({id:place.id,name:place.en,codes});
    matches = [];
  }
  if (!matches.length) { unmatched.push({id:place.id,name:place.en,province}); continue; }
  records[place.id] = {
    codes, international:codes.map(code=>'+27 '+code.slice(1)),
    source:matches[0].source, sources:[...new Set(matches.map(x=>x.source))],
    scope:'Geographic fixed-line area code',
    provenance:{method:direct.length ? 'Exact settlement name or documented historical alias in Telkom town directory' : police.length ? 'Exact settlement name and province in official SAPS fixed-line directory' : 'Individually audited local government facility contact',matchedNames:[...new Set(matches.map(x=>x.name))]},
  };
}
const result = {country:'south-africa',countryCode:'+27',records,sources:[
  {id:'icasa',title:'ICASA National Numbering Plan Regulations, Table 3',url:planURL},
  {id:'telkom',title:'Telkom South African town dialling codes',url:telkomURL},
  {id:'saps',title:'South African Police Service official station contact directory',url:sapsURL},
  ...audited.map(x=>({id:'local-'+norm(x.name),title:x.title,url:x.source})),
],coverage:{total:settlements.length,verified:Object.keys(records).length,unmatched:unmatched.length},note:'Geographic fixed-line codes; mobile and non-geographic numbers are excluded. Codes describe telephone areas, not municipal or census boundaries.'};
assert.ok(telkom.length > 1000, 'Telkom snapshot incomplete');
assert.ok(saps.length > 800, 'SAPS snapshot incomplete');
assert.deepEqual(Object.values(records).find(x=>x.provenance.matchedNames.includes('Johannesburg'))?.codes,['010','011']);
const expected = {Pretoria:'012',Durban:'031','Cape Town':'021',Gqeberha:'041',Bloemfontein:'051',Mbombela:'013',Polokwane:'015'};
for (const [name,code] of Object.entries(expected)) {
  const place = settlements.find(x=>x.en===name);
  assert.ok(place && records[place.id]?.codes.includes(code), `${name} must have ${code}`);
}
for (const [id,record] of Object.entries(records)) {
  assert.ok(settlements.some(x=>x.id===id));
  assert.ok(record.codes.every(x=>valid.has(x)));
  assert.ok(record.sources.every(x=>/^https:\/\//.test(x)));
}
if (process.argv.includes('--check')) {
  assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')), result, 'Regenerate phone-code data');
} else {
  fs.writeFileSync(output, JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(sourceDir,'coverage.json'),JSON.stringify({unmatched,conflicts},null,2)+'\n');
}
console.log(`Verified geographic phone codes for ${result.coverage.verified}/${settlements.length} settlements; ${conflicts.length} conflicts withheld.`);
