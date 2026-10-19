import fs from 'node:fs';
import {build} from 'esbuild';
await build({stdin:{contents:"export {createClient} from '@supabase/supabase-js';",resolveDir:process.cwd(),sourcefile:'supabase-client.mjs'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',outfile:'dist/vendor/supabase.mjs'});
fs.copyFileSync('node_modules/@supabase/supabase-js/LICENSE','dist/vendor/supabase-LICENSE');
console.log('Supabase browser library bundled locally.');
