// Refresh the reviewed 2026/2025/2023 snapshot, then run extract-brazil-statistics.py.
// Extraction requires Python packages xlrd, openpyxl and pypdf.
import fs from 'node:fs/promises';
const dir='artifacts/brazil-statistics/';await fs.mkdir(dir,{recursive:true});
const urls={
 'population.txt':'https://apisidra.ibge.gov.br/values/t/6579/n3/all/v/9324/p/2026/f/a',
 'populationTable.xlsx':'https://ftp.ibge.gov.br/Estimativas_de_Populacao/Estimativas_2026/estimativa_dou_2026.xlsx',
 'gdp.json':'https://apisidra.ibge.gov.br/values/t/5938/n3/all/v/37/p/2023/f/a',
 'gdpTables.zip':'https://ftp.ibge.gov.br/Contas_Regionais/2023/xls/Especiais_2010_2023_xls.zip',
 'areaTable.xls':'https://geoftp.ibge.gov.br/organizacao_do_territorio/estrutura_territorial/areas_territoriais/2025/AR_BR_RG_UF_RGINT_RGI_MUN_2025.xls',
 'stateReport.pdf':'https://sapl.al.am.leg.br/media/sapl/public/materialegislativa/2026/181682/mg_17_26.pdf',
 'exchange.txt':'https://api.worldbank.org/v2/country/BRA/indicator/PA.NUS.FCRF?date=2023&format=json'
};
for(const [file,url] of Object.entries(urls)){const r=await fetch(url,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(file+' returned '+r.status);await fs.writeFile(dir+file,Buffer.from(await r.arrayBuffer()));console.log(file);}
