const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function municipalSourceRequest(url,options={}){
 for(let attempt=0;attempt<6;attempt++){
  const response=await fetch(url,{...options,headers:{...options.headers,'User-Agent':'BoundaryAtlas/1.0 (https://github.com/Ethan-H147/china_interactive_map; municipal flags and geographic identity)'},signal:AbortSignal.timeout(120000)});
  if(response.ok||![429,502,503,504].includes(response.status))return response;
  const header=response.headers.get('retry-after'),ms=header?(/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-Date.now()):30000;
  console.log('Source cooldown',response.status,Math.ceil(ms/1000)+' seconds');
  await pause(Math.max(ms,5000));
 }
 throw Error('Municipal source remained unavailable');
}
