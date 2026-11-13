const kinds = [
  ['home', 'Home nation', '#94add6', ['Home nation']],
  ['crown', 'Crown dependency or separate kingdom', '#b8b3b0', ['Separate kingdom', 'Crown dependency']],
  ['colony', 'Colony or overseas territory', '#d29c93', ['Colony', 'Overseas territory', 'Commission of Government', 'Sovereign base areas', 'Imperial administration', 'Australian-administered territory']],
  ['company', 'Chartered company', '#cfb37e', ['Chartered company']],
  ['protection', 'Protectorate or associated state', '#8fb591', ['Protectorate', 'Associated state', 'Leased administration']],
  ['dominion', 'Self-governing dominion', '#b69cc9', ['Self-governing dominion']],
  ['mandate', 'Mandate, trusteeship or joint rule', '#8cb7bf', ['League of Nations mandate', 'UN trust territory', 'Joint administration']],
  ['claim', 'Disputed claim or occupation', '#b5a16a', ['Disputed claim', 'Military occupation']]
];
const status = new Map(kinds.flatMap(([kind, , , types]) => types.map(type => [type, kind])));
const kingdom = year => year < 1801 ? 'Kingdom of Great Britain' : year < 1922 ?
  'United Kingdom of Great Britain and Ireland' : year < 1927 ?
  'United Kingdom after the Irish Free State' : 'United Kingdom of Great Britain and Northern Ireland';

export const ukHistory = {
  label: 'Historical snapshot',
  store: 'atlas-uk-history-year',
  file: 'history/borders.bin',
  sourcesFile: 'history/sources.json',
  defaultYear: 1707,
  standalone: true,
  frameOuter: true,
  releaseOnLeave: true,
  reuseHostGeometry: true,
  replaceContextLabels: true,
  matchLegendPaint: true,
  unitLabel: 'Nation or territory',
  searchLabel: 'Find a historical nation or territory',
  keys: kinds.map(([key, label, color]) => [key, label, color]),
  kind: unit => status.get(unit.type),
  kindLabel: unit => unit.type,
  describe: unit => unit.note,
  counts: units => {
    const home = units.filter(unit => unit.type === 'Home nation').length;
    const overseas = units.filter(unit => !['Home nation', 'Separate kingdom', 'Crown dependency'].includes(unit.type)).length;
    return home + ' home nations, ' + overseas + ' overseas';
  },
  title: year => 'Territorial changes in ' + year,
  dateText: kingdom,
  changeText: (year, changed) => year === 1707 ? 'Acts of Union' :
    changed ? 'Territorial changes this year' : 'Same map as the previous year',
  noChanges: 'No mapped territorial changes this year.',
  coverage: 'Year-end map with modern atlas outlines where extents match and historical reconstructions elsewhere. Coverage of Indigenous territories and wartime occupations is limited.',
  sourceName: 'UK historical sources & coverage',
  source: 'data/europe/united-kingdom/history/sources.json',
  omitFrontiers: year => ({
    country: 'GBR',
    pairs: [
      ...(year >= 1858 && year < 1947 ? ['IND-PAK', 'BGD-IND'] : []),
      ...(year >= 1899 && year < 1956 ? ['SDN-SSD', 'SSD-SDN'] : []),
      ...(year >= 1920 && year < 1948 ? ['ISR-PSX', 'ISR-PSE'] : []),
      ...(year >= 1878 && year < 1960 ? ['CYN-CYP', 'CYP-CYN'] : [])
    ]
  })
};
