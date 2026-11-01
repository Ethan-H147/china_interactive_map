import {execFileSync} from 'node:child_process';
// Build only the repaired China sources and their derived overview copies.
for(const [script,...args] of [
 ['reconcile-shanxi-provinces.mjs'],['reconcile-shanxi-counties.mjs'],
 ['pack-china-boundaries.mjs','--retain-lake-sources'],['prepare-motion.mjs'],
 ['refresh-shanxi-context.mjs'],['build-globe-overview.mjs'],['build-border-previews.mjs'],
])execFileSync(process.execPath,['--max-old-space-size=10000','scripts/'+script,...args],{stdio:'inherit'});
await import('./refresh-shanxi-reference-copies.mjs');
