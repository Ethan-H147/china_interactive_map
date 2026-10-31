import {nationalCountryPalettes} from './national-country-palettes.mjs';
export const definitions=[
 {country:'belize',iso:'BLZ',prefix:'bz',en:'Belize',local:'',lang:'en',continent:'North America',levels:['Districts']},
 {country:'guatemala',iso:'GTM',prefix:'gt',en:'Guatemala',local:'',lang:'es',continent:'North America',levels:['Departments','Municipalities']},
 {country:'el-salvador',iso:'SLV',prefix:'sv',en:'El Salvador',local:'',lang:'es',continent:'North America',levels:['Departments','Municipalities','Districts']},
 {country:'honduras',iso:'HND',prefix:'hn',en:'Honduras',local:'',lang:'es',continent:'North America',levels:['Departments','Municipalities']},
 {country:'nicaragua',iso:'NIC',prefix:'ni',en:'Nicaragua',local:'',lang:'es',continent:'North America',levels:['Departments & autonomous regions','Municipalities']},
 {country:'antigua-and-barbuda',iso:'ATG',prefix:'ag',en:'Antigua and Barbuda',local:'',lang:'en',continent:'North America',levels:['Parishes & dependencies'],gb:true},
 {country:'barbados',iso:'BRB',prefix:'bb',en:'Barbados',local:'',lang:'en',continent:'North America',levels:['Parishes'],gb:true},
 {country:'dominica',iso:'DMA',prefix:'dm',en:'Dominica',local:'',lang:'en',continent:'North America',levels:['Parishes'],gb:true},
 {country:'grenada',iso:'GRD',prefix:'gd',en:'Grenada',local:'',lang:'en',continent:'North America',levels:['Parishes & island dependencies']},
 {country:'saint-kitts-and-nevis',iso:'KNA',prefix:'kn',en:'Saint Kitts and Nevis',local:'',lang:'en',continent:'North America',levels:['Parishes'],gb:true},
 {country:'saint-lucia',iso:'LCA',prefix:'lc',en:'Saint Lucia',local:'',lang:'en',continent:'North America',levels:['Districts'],gb:true},
 {country:'saint-vincent-and-the-grenadines',iso:'VCT',prefix:'vc',en:'Saint Vincent and the Grenadines',local:'',lang:'en',continent:'North America',levels:['Parishes']},
 {country:'trinidad-and-tobago',iso:'TTO',prefix:'tt',en:'Trinidad and Tobago',local:'',lang:'en',continent:'North America',levels:['Regional corporations & municipalities']},
 {country:'guyana',iso:'GUY',prefix:'gy',en:'Guyana',local:'',lang:'en',continent:'South America',levels:['Regions'],gb:true},
 {country:'suriname',iso:'SUR',prefix:'sr',en:'Suriname',local:'',lang:'nl',continent:'South America',levels:['Districts','Resorts']}
].map(d=>({...d,...nationalCountryPalettes[d.country]}));
