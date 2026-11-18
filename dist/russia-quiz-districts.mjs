export const russiaQuizDistricts = {
  Central: 'BEL BRY VLA VOR IVA KLU KOS KRS LIP MOS MOW ORL RYA SMO TAM TVE TUL YAR',
  Northwestern: 'KR KO ARK VLG KGD LEN MUR NEN NGR PSK SPE',
  Southern: 'AD KL KDA AST VGG ROS',
  'North Caucasian': 'DA IN KB KC SE CE STA',
  Volga: 'BA ME MO TA UD CU PER KIR NIZ ORE PNZ SAM SAR ULY',
  Ural: 'KGN SVE TYU CHE KHM YAN',
  Siberian: 'AL TY KK ALT KYA IRK KEM NVS OMS TOM',
  'Far Eastern': 'BU SA ZAB KAM PRI KHA AMU MAG SAK YEV CHU'
};
const bySubject = new Map(Object.entries(russiaQuizDistricts).flatMap(([district, codes]) =>
  codes.split(' ').map(code => ['RU-' + code, district])));
export function inRussiaQuizDistrict(record, district) {
  return !district || bySubject.get(record.region || record.id) === district;
}
export function districtBounds(records, district) {
  // Chukotka crosses the date line. Frame the district in one continuous longitude interval.
  if (district === 'Far Eastern' && records.some(r => r.id === 'RU-CHU')) return [[98,41],[192,78]];
  const boxes = records.map(r => r.bounds);
  return [[Math.min(...boxes.map(b=>b[0][0])),Math.min(...boxes.map(b=>b[0][1]))],
    [Math.max(...boxes.map(b=>b[1][0])),Math.max(...boxes.map(b=>b[1][1]))]];
}
