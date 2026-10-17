// Reuse the shared expansion build and existing asset pipelines.
process.env.ONLY='denmark';
await import('./fetch-denmark-statistics.mjs');
await import('./build-country-expansion.mjs');
await import('./prepare-denmark-towns.mjs');
await import('./fetch-europe-flags.mjs');
await import('./fetch-europe-expansion-flags.mjs');
await import('./prepare-flag-images.mjs');
await import('./build-world-land.mjs');
const {spawnSync}=await import('node:child_process');
const packed=spawnSync(process.execPath,['scripts/build-compact.mjs'],{stdio:'inherit'});if(packed.status!==0)throw Error('Compact rebuild failed');
const{prepareRegionColors}=await import('./prepare-region-colors.mjs');prepareRegionColors();
