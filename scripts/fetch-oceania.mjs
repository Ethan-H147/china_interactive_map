import {arcgis,retain,request} from './oceania-sources.mjs';
const abs='https://geo.abs.gov.au/arcgis/rest/services/',nz='https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/';
await Promise.all([
 arcgis('au-lga-2025',abs+'ASGS2025/LGA/MapServer/0',{provider:'Australian Bureau of Statistics · full-resolution ASGS LGA 2025',license:'CC BY 4.0 · Commonwealth of Australia (ABS)'}),
 arcgis('au-population-2025',abs+'Hosted/LGA_Regional_Population_2025/FeatureServer/1',{geometry:false,fields:'lga_code_2025,lga_name_2025,state_code_2021,state_name_2021,erp_2025,area_km2',provider:'ABS · estimated resident population at 30 June 2025',license:'CC BY 4.0'}),
 arcgis('nz-regions-2025',nz+'Regional_Council_2025/FeatureServer/0',{provider:'Stats NZ · regional councils, 1 January 2025',license:'CC BY 4.0 · Stats NZ'}),
 arcgis('nz-authorities-2026',nz+'Territorial_Authority_2026/FeatureServer/0',{provider:'Stats NZ · territorial authorities, 1 January 2026',license:'CC BY 4.0 · Stats NZ'}),
 arcgis('nz-region-population-2023',nz+'Population_change_between_the_2018_and_2023_Censuses_Regional_Council_FINAL/FeatureServer/0',{geometry:false,provider:'Stats NZ · 2023 Census usually resident population by regional council',license:'CC BY 4.0'}),
 arcgis('nz-local-population-2023',nz+'Population_change_between_the_2018_and_2023_Censuses_TALB_FINAL/FeatureServer/0',{geometry:false,provider:'Stats NZ · 2023 Census usually resident population by territorial authority/local board',license:'CC BY 4.0'}),
 arcgis('nz-land-linz', 'https://services.arcgis.com/xdsHIIxuCWByZiCB/arcgis/rest/services/LINZ_NZ_Coastline/FeatureServer/0',{provider:'Toitū Te Whenua LINZ · NZ Coastline land polygons, full available resolution',license:'CC BY 4.0 · LINZ'})
]);
