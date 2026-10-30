import {splitMetadata} from './inline-typography.mjs';
const paragraph=(anchor,text,tag='p')=>{const el=document.createElement(tag);el.textContent=text;if(tag==='small')splitMetadata(el);anchor.append(el);return el;};
export function renderZipCodeCard(anchor,record,data){
 anchor.replaceChildren();anchor.hidden=record?.thematic!=='zip-codes';if(anchor.hidden)return;
 paragraph(anchor,record.current?'USPS ZIP code':'Historical Census ZIP area','h3');
 if(record.locales?.length)paragraph(anchor,record.locales.join(' · '));
 if(record.postalStates?.length)paragraph(anchor,'Postal service: '+record.postalStates.join(', '));
 if(record.poBoxOnly)paragraph(anchor,'PO box delivery');
 paragraph(anchor,record.hasBoundary?'Boundary: Census 2020 ZCTA. A generalized reference area, not a current USPS delivery boundary.':'No Census ZIP-area boundary is available. This code remains searchable without an invented polygon.');
 if(!record.current)paragraph(anchor,'This 2020 Census code is absent from the October 2026 USPS assignment snapshot.');
 if(record.parents?.length>1)paragraph(anchor,'This Census ZIP area crosses state lines.');
 paragraph(anchor,'USPS assignments · '+data.asOf,'small');
 const link=paragraph(anchor,'Sources & coverage','a');link.href='data/europe/united-states/zip-codes/sources.json';link.target='_blank';link.rel='noopener';link.style.display='block';link.style.marginTop='12px';
}
export function renderMunicipalCard(anchor,record){
 anchor.replaceChildren();anchor.hidden=record?.incorporated===undefined||!!record?.municipalRank;if(anchor.hidden)return;
 paragraph(anchor,record.governmentStatus==='F'?'Statistical city balance':record.sourceType==='cousub'||record.sourceType==='concity'?record.kind:record.incorporated?'Incorporated '+record.kind.toLowerCase():'Unincorporated community','h3');
 if(record.governmentStatus==='F')paragraph(anchor,'A Census statistical remainder, excluding separately incorporated places within the consolidated government.');else if(!record.incorporated)paragraph(anchor,'A Census-designated place, not an incorporated municipal government.');
 paragraph(anchor,'Land area: '+record.areaKm2.toLocaleString('en-US',{maximumFractionDigits:2})+' km²');
 paragraph(anchor,'Census '+record.boundaryYear+' · generalized cartographic boundary','small');
}
