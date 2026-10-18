import {lineData,lineSourceOptions} from './adaptive-lines.mjs';

// Use one screen-space policy for every regional country's selected coastline
// and lake rings. No geographic vertices or selection IDs are removed.
export const selectionLineSourceOptions={...lineSourceOptions,tolerance:.35};
export function selectionLineData(input){
 // Fade small rings from a 12 px footprint to 32 px. Large coastlines remain
 // visible; MapLibre drops subpixel bends per tile and restores them on zoom.
 return lineData(input,{minimumPixels:12,areaSensitive:true});
}
