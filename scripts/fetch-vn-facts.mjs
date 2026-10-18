import {execFileSync} from 'node:child_process';
import {retain} from './mainland-seasia-sources.mjs';
const url='https://vnpa.moh.gov.vn/tra-cuu-ban-do-dan-so-trung-tam-hanh-chinh-grdp-cua-34-tinh-thanh-sau-sap-nhap/';await retain('vn-province-facts',url,{provider:'Vietnam Population Authority · province figures following the 2025 reorganisation'},async()=>({html:execFileSync('curl.exe',['-fsSL','--retry','2','--max-time','45',url],{encoding:'utf8',maxBuffer:5e6})}));
