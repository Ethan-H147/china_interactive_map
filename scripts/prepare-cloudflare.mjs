import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

// Deploy the checked-out commit, never a moving branch or a retained hosting pin.
const checkout=execFileSync('git',['-c','safe.directory='+process.cwd(),'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const version=process.env.WORKERS_CI_COMMIT_SHA||checkout;
if(!/^[a-f0-9]{40}$/.test(version)||version!==checkout)throw Error('Cloudflare source commit does not match the checkout');
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8'));
if(config.name!=='china-interactive-map'||config.assets?.directory!=='./dist')throw Error('Unexpected Cloudflare target');
for(const file of ['index.html','app.js','city-quiz.mjs','satellite.mjs','quiz-supabase.mjs'])if(!fs.existsSync('dist/'+file))throw Error('Missing runtime file: '+file);
if(!process.argv.includes('--check'))fs.writeFileSync('dist/version.json',JSON.stringify({version})+'\n');
console.log(JSON.stringify({worker:config.name,version,assets:config.assets.directory,checkOnly:process.argv.includes('--check')}));
