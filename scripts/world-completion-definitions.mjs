import fs from 'node:fs';import {nationalCountryPalettes} from './national-country-palettes.mjs';
export const definitions=JSON.parse(fs.readFileSync(new URL('./world-completion-definitions.json',import.meta.url))).map(d=>({...d,...nationalCountryPalettes[d.country]}));
