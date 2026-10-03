import mapshaper from 'mapshaper';

// Independently exported parish edges differ by fractions of a millimetre.
// Join those edges before deriving the coastline and internal line networks.
// This tolerance is local to Macau; it must not close real coastal channels.
export async function reconcileMacau(collection){
 const output=await mapshaper.applyCommands(
  '-i input.json -clean snap-interval=0.00000001 gap-width=0.1m overlap-rule=min-area -o output.json format=geojson',
  {'input.json':collection}
 );
 return JSON.parse(output['output.json']);
}
