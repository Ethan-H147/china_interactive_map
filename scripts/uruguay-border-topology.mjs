import mapshaper from 'mapshaper';
export const uruguayOutlineMethod='Shared department boundaries, including derived dividing lines through gaps between river and reservoir banks. Gap topology is prepared on a separate copy; displayed land polygons and water gaps remain unchanged. No exterior coastline strokes.';

// IGM's department polygons exclude rivers and reservoirs. Opposite banks do
// not share arcs, so a land-only mesh omits the administrative border there.
// Divide those gaps between neighboring departments on a temporary copy used
// only to derive lines. The displayed land, water, and country exterior stay
// unchanged. Only shared arcs from this copy are rendered, never its exterior.
export async function uruguayBorderTopology(regions){
 const files=await mapshaper.applyCommands('-i input.json -clean gap-width=5000m close-outer-gaps -o output.json format=geojson precision=0.000001',{'input.json':JSON.stringify(regions)});
 return JSON.parse(files['output.json']);
}
