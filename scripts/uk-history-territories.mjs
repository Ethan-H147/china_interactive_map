// Intervals are inclusive at the start and exclusive at the end. null means
// the administration or claim remains in the last year-end snapshot.
export const firstYear = 1707;
export const lastYear = 2025;

// Generalized land frontiers traced against the longitude and latitude ticks
// of UN map 835 (1956) and the Colonial Office's Cameroons map (1949).
const togolandWest = [
  [.188,6.337],[.313,6.659],[.190,6.681],[.116,6.862],[.192,7.029],[.245,7.217],[.226,7.384],
  [.128,7.431],[.146,7.500],[.025,7.598],[-.015,7.732],[-.106,7.786],[-.154,7.873],[-.180,8.011],
  [-.275,8.029],[-.341,8.105],[-.388,8.199],[-.239,8.221],[-.167,8.214],[-.174,8.330],[-.327,8.319],
  [-.247,8.399],[-.230,8.507],[-.193,8.518],[-.230,8.572],[-.310,8.529],[-.441,8.630],[-.478,8.725],
  [-.347,8.732],[-.322,8.808],[-.344,8.880],[-.225,8.946],[-.232,9.004],[-.200,9.087],[-.244,9.116],
  [-.077,9.178],[-.022,9.272],[-.165,9.344],[-.209,9.424],[-.224,9.547],[-.214,9.703],[-.181,9.746],
  [-.294,9.877],[-.299,9.996],[-.321,10.069],[-.274,10.170],[-.285,10.272],[-.249,10.348],
  [-.279,10.457],[-.258,10.605],[-.207,10.692],[-.219,10.757],[-.190,10.870],[-.205,10.982],
  [-.158,11.087],[-.199,11.174]
];
const cameroonsWest = [
  [
    [14.219,12.608],[14.082,12.338],[14.009,12.176],[13.896,12.068],[13.795,11.838],[13.799,11.703],
    [13.671,11.493],[13.471,11.473],[13.406,11.304],[13.315,11.209],[13.303,10.905],[13.383,10.797],
    [13.285,10.649],[13.247,10.473],[13.238,10.331],[13.114,10.257],[13.138,10.095],[12.999,9.953],
    [13.051,9.791],[13.075,9.574],[13.149,9.520]
  ],
  [
    [12.807,8.966],[12.717,8.885],[12.601,8.818],[12.275,8.804],[12.167,8.912],[12.071,8.838],
    [11.847,8.797],[11.703,8.676],[11.620,8.486],[11.625,8.324],[11.426,8.088],[11.229,7.973],
    [11.081,7.980],[10.971,7.804],[10.801,7.608],[10.660,7.635],[10.463,7.480],[10.321,7.318],
    [10.219,7.081],[10.279,6.966],[10.400,6.865],[10.541,6.824]
  ]
];
function eastOf(frontier, east) {
  const start = [east, frontier[0][1]], end = [east, frontier.at(-1)[1]];
  return [[[start, ...frontier, end, start]]];
}

export function addTerritories({add, modern, atlas, historical, box, cut, minus, union, series}) {
  const home = 'Home nation';
  const dependency = 'Crown dependency';
  const colony = 'Colony';
  const company = 'Chartered company';
  const protection = 'Protectorate';
  const dominion = 'Self-governing dominion';
  const mandate = 'League of Nations mandate';
  const trust = 'UN trust territory';
  const joint = 'Joint administration';
  const claim = 'Disputed claim';
  const overseas = 'Overseas territory';
  const gb = ids => atlas('united-kingdom', ids);
  const mandated = (id, name, coordinates, from, transfer, until, note) => {
    add(id, name, mandate, from, transfer, coordinates, {note});
    add(id, name, trust, transfer, until, coordinates, {note});
  };

  add('england', 'England', home, 1707, null, gb(/^GB-R-TL[C-K]$/));
  add('scotland', 'Scotland', home, 1707, null, gb('GB-R-TLM'));
  add('wales', 'Wales', home, 1707, null, gb('GB-R-TLL'));
  const northernIreland = gb('GB-R-TLN');
  const ireland = union(northernIreland, atlas('ireland'));
  add('ireland', 'Kingdom of Ireland', 'Separate kingdom', 1707, 1801, ireland, {
    note: 'Ireland shared a monarch with Great Britain and retained its own parliament until the parliamentary union of 1801.'
  });
  add('ireland', 'Ireland', home, 1801, 1922, ireland, {
    note: 'The 1801 union brought Ireland into the United Kingdom. The whole island remains in this year-end map through 1921. Northern Ireland gained its own parliament in 1921.'
  });
  add('northern-ireland', 'Northern Ireland', home, 1922, null, northernIreland);
  add('isle-of-man', 'Isle of Man', dependency, 1707, null, gb('GB-X-IM'), {
    note: 'A possession of the Crown with its own legislature. The Crown purchased the lordship from the Duke of Atholl in 1765.'
  });
  add('jersey', 'Jersey', dependency, 1707, null, gb('GB-X-JE'));
  add('guernsey', 'Bailiwick of Guernsey', dependency, 1707, null, gb('GB-X-GG'));

  // British North America. Early mainland outlines are generalized from
  // Cliopatria. From 1866 use the atlas's dated Canadian boundaries.
  const usEast = cut(modern('USA'), box(-95, 24, -66, 49.5));
  const florida = historical('united-states', 1783, /^foreign:spanish-(west-florida|florida)$/);
  const colonies = minus(usEast, florida);
  const americaNote = {
    note: 'The source reconstructs colonial claims and changing wartime holdings at regional scale. Indigenous nations retained sovereignty and control across much of the area claimed by Britain.'
  };
  series('atlantic-colonies', 'British American colonies', colony, 1707, 1733, colonies, americaNote);
  series('atlantic-colonies', 'Thirteen Colonies', colony, 1733, 1763, colonies, americaNote);
  // Georgia's enlarged southern charter meets the Floridas without the gap
  // left by the coarse empire outline. The retained Newberry mosaic supplies
  // the Mississippi and Chattahoochee paths; the 1764 commission supplies the
  // northern latitude of West Florida. These are claims, not settled control.
  const southernScope = box(-95, 24, -75, 35);
  const southernClaims = cut(historical('united-states', 1783, /^(ga|sc|nc)_state$/), southernScope);
  // Overlap the surveys at the old 31-degree join. Its slightly different
  // surveyed paths must not become a narrow Georgia strip inside West Florida.
  const westFloridaSurvey = historical('united-states', 1804, 'ms_terr')
    .map(p=>p.map(r=>r.map(([x,y])=>[x,y<31.02?30.95:y])));
  const westFloridaExtension = cut(historical('united-states', 1783, 'ga_state'),
    cut(westFloridaSurvey, box(-92, 30.9, -84, 32 + 28 / 60)));
  const expandedFlorida = union(florida, westFloridaExtension);
  const southernNote = {...americaNote, label: [-80.85, 33.9]};
  for (const [from, until, extent] of [[1763,1764,florida],[1764,1776,expandedFlorida],[1776,1783,expandedFlorida]]) {
    const name = from < 1776 ? 'Thirteen Colonies' : 'British claims in the American Revolution';
    series('atlantic-colonies', name, from < 1776 ? colony : claim, from, until, minus(usEast,extent),
      southernNote, coordinates => minus(union(minus(coordinates,southernScope),southernClaims),extent));
    add('floridas', 'East and West Florida', colony, from, until, extent, {
      note: 'Spain ceded Florida in 1763. The initial northern boundary of West Florida followed latitude 31°; the 1764 governor’s commission extended it to 32°28′. The retained Newberry mosaic supplies the river boundaries and adjoining Georgia charter. Both Floridas returned to Spain in 1783.'
    });
  }
  const rupertsLand = historical('canada', 1866, 'ruperts-land');
  const newfoundland = historical('canada', 1866, 'NL');
  const newfoundlandIsland = cut(newfoundland, box(-60, 46, -51, 52));
  const canada = (year, keys) => historical('canada', year, keys);
  const novaScotia = canada(1866, 'NS'), newBrunswick = canada(1866, 'NB'), princeEdward = canada(1866, 'PE');
  const maritimes = union(novaScotia, newBrunswick, princeEdward);
  const canadaMask = minus(cut(modern('CAN'), box(-141.1, 41, -52, 84)), rupertsLand, newfoundlandIsland, maritimes);
  const stLawrence = cut(canadaMask, box(-87, 41, -52, 58));
  const northAmericaNote = {
    note: 'Generalized mainland British colonies and claims. The Atlantic colonies, Newfoundland and the Hudson’s Bay Company charter are shown separately.'
  };
  series('british-north-america', 'British North America', colony, 1707, 1866, minus(canadaMask, stLawrence), northAmericaNote);
  series('canada', 'Province of Quebec', colony, 1763, 1791, stLawrence, {
    note: 'Britain acquired New France in 1763. This outline represents the source’s land north of the modern United States boundary. Quebec’s claims also extended farther south after the Quebec Act of 1774.'
  });
  series('canada', 'Upper and Lower Canada', colony, 1791, 1841, stLawrence);
  series('canada', 'Province of Canada', colony, 1841, 1866, stLawrence);
  const capeBreton = cut(novaScotia, box(-61.55, 45.56, -59.3, 47.2));
  add('nova-scotia', 'Nova Scotia', colony, 1713, 1763, minus(novaScotia, capeBreton), {
    note: 'The Treaty of Utrecht transferred Acadia to Britain. The map approximates the peninsular colony, with Cape Breton still French.'
  });
  add('nova-scotia', 'Nova Scotia', colony, 1763, 1784, union(novaScotia, newBrunswick));
  add('nova-scotia', 'Nova Scotia', colony, 1784, 1820, minus(novaScotia, capeBreton));
  add('cape-breton', 'Cape Breton Island', colony, 1784, 1820, capeBreton);
  add('nova-scotia', 'Nova Scotia', colony, 1820, 1867, novaScotia);
  add('new-brunswick', 'New Brunswick', colony, 1784, 1867, newBrunswick);
  add('prince-edward-island', 'St John’s Island', colony, 1763, 1799, princeEdward);
  add('prince-edward-island', 'Prince Edward Island', colony, 1799, 1873, princeEdward);
  add('ruperts-land', 'Rupert’s Land', company, 1707, 1870, rupertsLand, {
    note: 'The Hudson’s Bay Company’s charter covered the Hudson Bay drainage basin. This is the late charter footprint, with earlier limits generalized. The charter granted exclusive trade rights and did not extinguish Indigenous sovereignty.'
  });
  series('newfoundland', 'English settlements in Newfoundland', colony, 1707, 1713, newfoundlandIsland);
  add('newfoundland', 'Newfoundland', colony, 1713, 1763, newfoundlandIsland);
  add('newfoundland', 'Newfoundland and Labrador', colony, 1763, 1774, newfoundland);
  add('newfoundland', 'Newfoundland', colony, 1774, 1809, newfoundlandIsland);
  add('newfoundland', 'Newfoundland and Labrador', colony, 1809, 1907, newfoundland, {
    note: 'Labrador returned to Newfoundland’s jurisdiction in 1809. The interior boundary remained in dispute until the 1927 ruling.'
  });
  add('newfoundland', 'Dominion of Newfoundland', dominion, 1907, 1927, newfoundland);
  const newfoundland1927 = historical('canada', 1927, 'NL');
  add('newfoundland', 'Dominion of Newfoundland', dominion, 1927, 1934, newfoundland1927);
  add('newfoundland', 'Newfoundland', 'Commission of Government', 1934, 1949, newfoundland1927, {
    note: 'An appointed commission replaced responsible government in 1934. Newfoundland joined Canada on 31 March 1949.'
  });
  add('canada', 'Province of Canada', colony, 1866, 1867, canada(1866, 'PC'));
  add('british-columbia', 'British Columbia', colony, 1866, 1871, canada(1866, 'BC'));
  add('north-western-territory', 'North-Western Territory', claim, 1866, 1870, canada(1866, 'north-western'));
  add('arctic-territories', 'British Arctic territories', claim, 1866, 1880, canada(1866, 'arctic'));
  for (const [from, until] of [[1867, 1870], [1870, 1871], [1871, 1873], [1873, 1880], [1880, 1927], [1927, 1931]]) {
    const keys = new Set(['NL', 'ruperts-land', 'north-western', 'arctic']);
    if (from < 1871) keys.add('BC');
    if (from < 1873) keys.add('PE');
    add('canada', 'Dominion of Canada', dominion, from, until, canada(from, key => !keys.has(key)), {
      note: 'The Dominion had responsible self-government from Confederation. This timeline ends its separate imperial status at the Statute of Westminster in 1931.'
    });
  }
  add('oregon', 'Oregon Country', claim, 1818, 1846,
    historical('united-states', 1818, 'or_country'), {
      note: 'Britain and the United States shared access until the Oregon Treaty. This view shows the portion now in the United States.'
    });

  // Atlantic, Caribbean and South America.
  const small = (id, name, code, from, until, type = colony, note) =>
    add(id, name, type, from, until, modern(code), note ? {note} : undefined);
  const retained = (id, name, shape, from, until = 2002, type = colony, note) => {
    const extra = note ? {note} : undefined;
    add(id, name, type, from, until, shape, extra);
    add(id, name, overseas, until, null, shape, extra);
  };
  retained('bermuda', 'Bermuda', gb('GB-O-BM'), 1707);
  retained('anguilla', 'Anguilla', gb('GB-O-AI'), 1707, 2002, colony,
    'Anguilla broke with the associated state of Saint Kitts, Nevis and Anguilla in 1967. It became a separate British dependency in 1980.');
  retained('virgin-islands', 'British Virgin Islands', gb('GB-O-VG'), 1707);
  retained('cayman', 'Cayman Islands', gb('GB-O-KY'), 1707, 2002, colony,
    'Administered with Jamaica until Jamaican independence in 1962, when the islands remained under British administration.');
  retained('montserrat', 'Montserrat', gb('GB-O-MS'), 1707);
  retained('turks-caicos', 'Turks and Caicos Islands', gb('GB-O-TC'), 1799);
  small('bahamas', 'Bahamas', 'BHS', 1707, 1973);
  small('jamaica', 'Jamaica', 'JAM', 1707, 1962);
  small('barbados', 'Barbados', 'BRB', 1707, 1966);
  const antigua = atlas('antigua-and-barbuda');
  add('antigua-barbuda', 'Antigua and Barbuda', colony, 1707, 1967, antigua);
  add('antigua-barbuda', 'Antigua and Barbuda', 'Associated state', 1967, 1981, antigua);
  const kittsNevis = modern('KNA');
  const nevis = cut(kittsNevis, box(-62.69, 16.9, -62.5, 17.198));
  add('kitts-nevis', 'Saint Kitts and Nevis', colony, 1707, 1713, nevis, {
    note: 'Nevis was English. Saint Kitts was divided between French and English settlements until 1713. The early outline includes Nevis alone.'
  });
  add('kitts-nevis', 'Saint Kitts and Nevis', colony, 1713, 1967, kittsNevis);
  add('kitts-nevis', 'Saint Kitts and Nevis', 'Associated state', 1967, 1983, kittsNevis);
  small('dominica', 'Dominica', 'DMA', 1763, 1778);
  small('dominica', 'Dominica', 'DMA', 1783, 1967);
  small('dominica', 'Dominica', 'DMA', 1967, 1978, 'Associated state');
  small('grenada', 'Grenada', 'GRD', 1763, 1779);
  small('grenada', 'Grenada', 'GRD', 1783, 1967);
  small('grenada', 'Grenada', 'GRD', 1967, 1974, 'Associated state');
  small('saint-vincent', 'Saint Vincent and the Grenadines', 'VCT', 1763, 1779);
  small('saint-vincent', 'Saint Vincent and the Grenadines', 'VCT', 1783, 1969);
  small('saint-vincent', 'Saint Vincent and the Grenadines', 'VCT', 1969, 1979, 'Associated state');
  small('saint-lucia', 'Saint Lucia', 'LCA', 1814, 1967);
  small('saint-lucia', 'Saint Lucia', 'LCA', 1967, 1979, 'Associated state');
  const trinidadTobago = modern('TTO');
  const tobago = cut(trinidadTobago, box(-61, 11, -60.3, 11.5));
  add('tobago', 'Tobago', colony, 1763, 1781, tobago);
  add('tobago', 'Tobago', colony, 1814, 1889, tobago);
  add('trinidad', 'Trinidad', colony, 1802, 1889, minus(trinidadTobago, tobago));
  add('trinidad', 'Trinidad and Tobago', colony, 1889, 1962, trinidadTobago);
  small('belize', 'British Honduras', 'BLZ', 1862, 1973, colony,
    'British logging settlements predated the Crown colony. Its mapped extent uses the later land frontier as a reference.');
  small('belize', 'Belize', 'BLZ', 1973, 1981);
  small('guyana', 'Demerara, Essequibo and Berbice', 'GUY', 1814, 1831, colony,
    'The Netherlands ceded the three colonies in 1814. The generalized outer boundary uses the later administered extent. Venezuela disputes the boundary in the west.');
  small('guyana', 'British Guiana', 'GUY', 1831, 1966, colony,
    'The mapped extent follows the later administered frontier. Venezuela disputes the boundary in the west.');
  const stHelena = gb('GB-O-SH');
  const ascension = cut(stHelena, box(-14.6, -8.2, -14, -7.6));
  const helena = cut(stHelena, box(-6.1, -16.2, -5.5, -15.8));
  const tristan = cut(stHelena, box(-14, -41, -9, -36));
  add('saint-helena', 'Saint Helena', company, 1707, 1834, helena);
  retained('saint-helena', 'Saint Helena', helena, 1834);
  retained('ascension', 'Ascension Island', ascension, 1815);
  retained('tristan', 'Tristan da Cunha', tristan, 1816, 2002, colony,
    'Britain took possession in 1816. The outline also includes the outlying islands placed under Saint Helena in 1938.');
  const falklands = gb('GB-O-FK');
  const westFalkland = cut(falklands, box(-62, -53, -59.2, -50));
  add('falklands', 'British claim to West Falkland', claim, 1765, 1774, westFalkland, {
    note: 'Britain claimed the islands in 1765 and established Port Egmont in 1766. This outline locates the British settlement’s island and is not an exclusive sovereignty claim.'
  });
  retained('falklands', 'Falkland Islands', falklands, 1833, 2002, colony,
    'Administered by the United Kingdom since 1833. Argentina claims sovereignty over the islands.');
  retained('south-georgia', 'South Georgia and the South Sandwich Islands', gb('GB-O-GS'), 1908, 2002, colony,
    'A Falkland Islands dependency from 1908 and a separate territory from 1985. Argentina claims sovereignty.');
  const antarctic = cut(modern('ATA'), box(-80, -90, -20, -60));
  add('antarctic', 'Falkland Islands Dependencies (Antarctica)', claim, 1908, 1962, antarctic, {
    label: [-65, -72],
    note: 'Approximate land within the later British sector. The claim’s wording was revised in 1917. The Antarctic Treaty entered into force in 1961 and preserves the positions of the parties on sovereignty.'
  });
  add('antarctic', 'British Antarctic Territory', claim, 1962, null, antarctic, {
    label: [-65, -72],
    note: 'The sector from 20°W to 80°W south of 60°S is a British claim overlapping Argentine and Chilean claims. Article IV of the Antarctic Treaty preserves the parties’ positions on sovereignty.'
  });

  // Mediterranean and Middle East.
  retained('gibraltar', 'Gibraltar', gb('GB-O-GI'), 1707, 2002, colony,
    'Anglo-Dutch forces took Gibraltar in 1704. Spain ceded it to Britain in 1713 under the Treaty of Utrecht and maintains a sovereignty claim.');
  const minorca = cut(modern('ESP'), box(3.78, 39.78, 4.34, 40.16));
  add('minorca', 'Minorca', colony, 1708, 1756, minorca);
  add('minorca', 'Minorca', colony, 1763, 1782, minorca);
  add('minorca', 'Minorca', colony, 1798, 1802, minorca);
  small('malta', 'Malta Protectorate', 'MLT', 1800, 1813, protection);
  small('malta', 'Malta', 'MLT', 1813, 1964);
  add('ionian-islands', 'United States of the Ionian Islands', protection, 1815, 1864,
    union(atlas('greece', 'GR-F'), cut(modern('GRC'), box(22.86, 35.83, 23.44, 36.42))), {
      note: 'A federation under British protection after the Napoleonic Wars. The islands joined Greece in 1864.'
    });
  const cyprus = modern('CYP', 'CYN', 'CNM', 'WSB', 'ESB');
  add('cyprus', 'British-administered Cyprus', 'Leased administration', 1878, 1914, cyprus);
  add('cyprus', 'Cyprus', colony, 1914, 1960, cyprus);
  add('cyprus-bases', 'Akrotiri and Dhekelia', 'Sovereign base areas', 1960, null, gb('GB-O-SBA'));
  small('egypt', 'British occupation of Egypt', 'EGY', 1882, 1914, 'Military occupation',
    'British troops occupied Egypt in 1882. Egypt remained formally within the Ottoman Empire until Britain declared a protectorate in 1914.');
  small('egypt', 'Sultanate of Egypt', 'EGY', 1914, 1922, protection,
    'British forces occupied Egypt in 1882. The formal protectorate lasted from 1914 until Britain recognized Egyptian independence in 1922, with reserved powers.');
  add('sudan', 'Anglo-Egyptian Sudan', joint, 1899, 1956, modern('SDN', 'SDS'), {
    note: 'Formally a condominium of Britain and Egypt, with a British governor-general. Sudan became independent in 1956.'
  });
  add('iraq', 'British administration of Iraq', mandate, 1920, 1932, modern('IRK', 'IRR'), {
    note: 'The San Remo settlement assigned the mandate in 1920. The Kingdom of Iraq joined the League of Nations in 1932.'
  });
  add('palestine', 'British Mandate for Palestine', mandate, 1920, 1948, modern('ISR', 'GAZ', 'WEB'), {
    note: 'British civil administration began in 1920. The League of Nations mandate entered into force in 1923 and ended in 1948.'
  });
  small('transjordan', 'Emirate of Transjordan', 'JOR', 1921, 1946, mandate);
  small('kuwait', 'Kuwait', 'KWT', 1899, 1961, protection);
  small('bahrain', 'Bahrain', 'BHR', 1861, 1971, protection);
  small('qatar', 'Qatar', 'QAT', 1916, 1971, protection);
  small('trucial-states', 'Trucial States', 'ARE', 1892, 1971, protection);
  const yemen = modern('YEM');
  const aden = cut(yemen, box(44.76, 12.72, 45.06, 12.92));
  add('aden', 'Aden Settlement', company, 1839, 1858, aden);
  add('aden', 'Aden Settlement', colony, 1858, 1937, aden);
  add('aden', 'Aden Colony', colony, 1937, 1963, aden);
  series('aden-protectorate', 'Aden Protectorate', protection, 1886, 1963, minus(yemen, aden), {
    note: 'A generalized source outline of the protected states around Aden. The treaties were made with individual rulers at different dates.'
  });
  series('aden-protectorate', 'South Arabian Federation and Protectorate', protection, 1963, 1967, yemen);

  // Africa: changing source outlines before borders stabilized; independent
  // territories leave the timeline at their formal transfers of power.
  const cape = modern('ZAF');
  series('cape', 'Cape Colony', colony, 1795, 1803, cape);
  series('cape', 'British colonies in southern Africa', colony, 1806, 1910, cape);
  add('south-africa', 'Union of South Africa', dominion, 1910, 1931, cape, {
    note: 'The Cape, Natal, Transvaal and Orange River colonies formed the Union in 1910. The Statute of Westminster marks the end of the Union’s separate imperial status here.'
  });
  small('lesotho', 'Basutoland', 'LSO', 1868, 1966, protection);
  small('botswana', 'Bechuanaland Protectorate', 'BWA', 1885, 1966, protection);
  small('eswatini', 'Swaziland', 'SWZ', 1903, 1968, protection);
  small('zimbabwe', 'Southern Rhodesia', 'ZWE', 1890, 1923, company,
    'The British South Africa Company administered the territory. The early footprint uses the later colonial outline.');
  small('zimbabwe', 'Southern Rhodesia', 'ZWE', 1923, 1965);
  small('zimbabwe', 'Rhodesia', 'ZWE', 1965, 1979, claim,
    'The white-minority government declared independence in 1965. Britain did not recognize the declaration. The map depicts the disputed status.');
  small('zimbabwe', 'Southern Rhodesia', 'ZWE', 1979, 1980, colony,
    'Britain briefly resumed administration under the Lancaster House Agreement before Zimbabwe’s independence.');
  small('zambia', 'Northern Rhodesia', 'ZMB', 1899, 1924, company);
  small('zambia', 'Northern Rhodesia', 'ZMB', 1924, 1964, protection);
  small('malawi', 'British Central Africa Protectorate', 'MWI', 1891, 1907, protection);
  small('malawi', 'Nyasaland', 'MWI', 1907, 1964, protection);
  series('sierra-leone', 'Freetown and Sierra Leone', colony, 1787, 1896, modern('SLE'));
  small('sierra-leone', 'Sierra Leone Colony and Protectorate', 'SLE', 1896, 1961);
  series('gambia', 'British settlements on the Gambia', colony, 1816, 1889, modern('GMB'));
  small('gambia', 'Gambia Colony and Protectorate', 'GMB', 1889, 1965);
  const ghana = modern('GHA');
  const togoland = cut(ghana, eastOf(togolandWest, 1.5));
  const goldCoast = minus(ghana, togoland);
  series('gold-coast', 'Gold Coast', colony, 1821, 1901, goldCoast);
  add('gold-coast', 'Gold Coast', colony, 1901, 1957, goldCoast);
  mandated('togoland', 'British Togoland', togoland, 1922, 1946, 1957,
    'The western part of former German Togoland. It joined the Gold Coast at Ghanaian independence in 1957.');
  const nigeria = modern('NGA');
  const northernCameroons = cut(nigeria, union(...cameroonsWest.map(frontier => eastOf(frontier, 15))));
  const nigeriaProper = minus(nigeria, northernCameroons);
  series('nigeria', 'Lagos and British protectorates on the Niger', protection, 1861, 1914, nigeriaProper);
  add('nigeria', 'Colony and Protectorate of Nigeria', colony, 1914, 1960, nigeriaProper);
  mandated('northern-cameroons', 'Northern Cameroons', northernCameroons, 1922, 1946, 1961,
    'The northern sections of British Cameroons, generalized from the 1949 Colonial Office survey. They joined Nigeria in 1961.');
  mandated('southern-cameroons', 'Southern Cameroons', atlas('cameroon', /^CM0(07|10)$/), 1922, 1946, 1961,
    'The southern section of British Cameroons. It joined Cameroon in 1961 and corresponds to the present North-West and South-West regions.');
  series('kenya', 'East Africa Protectorate', protection, 1895, 1920, modern('KEN'));
  small('kenya', 'Kenya Colony and Protectorate', 'KEN', 1920, 1963);
  small('uganda', 'Uganda Protectorate', 'UGA', 1894, 1962, protection);
  mandated('tanganyika', 'Tanganyika', modern('TZA'), 1922, 1946, 1961);
  small('zanzibar', 'Zanzibar Protectorate', 'TZZ', 1890, 1963, protection);
  small('somaliland', 'British Somaliland', 'SOL', 1884, 1960, protection);

  // South and Southeast Asia.
  const india = modern('IND', 'PAK', 'BGD');
  const indiaNote = {
    note: 'The extent is generalized from Cliopatria and includes areas of indirect rule. Many princely states retained their own rulers under British paramountcy.'
  };
  series('india', 'East India Company possessions', company, 1707, 1858, india, indiaNote);
  series('india', 'British Raj', 'Imperial administration', 1858, 1947, india, indiaNote);
  series('burma', 'Burma under British India', 'Imperial administration', 1826, 1937, modern('MMR'));
  small('burma', 'British Burma', 'MMR', 1937, 1948);
  series('ceylon', 'British Ceylon', colony, 1796, 1815, modern('LKA'));
  small('ceylon', 'Ceylon', 'LKA', 1815, 1948);
  small('maldives', 'Maldives', 'MDV', 1887, 1965, protection);
  small('mauritius', 'Mauritius', 'MUS', 1810, 1968);
  small('seychelles', 'Seychelles', 'SYC', 1810, 1965);
  small('seychelles', 'Seychelles', 'SYC', 1965, 1976);
  const chagos = gb('GB-O-IO');
  add('chagos', 'Chagos Archipelago (Mauritius dependency)', colony, 1810, 1965, chagos);
  add('chagos', 'British Indian Ocean Territory', colony, 1965, 1976, chagos, {
    note: 'Britain detached Chagos from Mauritius and Aldabra, Desroches and Farquhar from Seychelles in 1965. The three Seychelles island groups returned to Seychelles at independence in 1976.'
  });
  retained('chagos', 'British Indian Ocean Territory (Chagos Archipelago)', chagos, 1976, 2002, colony,
    'Britain detached Chagos from Mauritius in 1965 and forcibly removed the Chagossians. Mauritius claims sovereignty. The transfer agreement signed in 2025 had yet to take effect at year end.');
  const hongKong = modern('HKG');
  const hkIsland = cut(hongKong, box(114.10, 22.19, 114.27, 22.3004));
  const kowloon = cut(hongKong, box(114.135, 22.293, 114.241, 22.327));
  add('hong-kong', 'Hong Kong Island', colony, 1842, 1860, hkIsland);
  add('hong-kong', 'Hong Kong Island and Kowloon', colony, 1860, 1898, union(hkIsland, kowloon), {
    note: 'The Convention of Peking extended the area under British administration to southern Kowloon and Stonecutters Island. The old northern limit is generalized near Boundary Street.'
  });
  add('hong-kong', 'Hong Kong', colony, 1898, 1997, hongKong, {
    note: 'The New Territories were leased for 99 years from 1898. China resumed the exercise of sovereignty over all of Hong Kong on 1 July 1997.'
  });
  const malaya = cut(modern('MYS'), box(99.5, 1, 105, 7));
  const penangState = atlas('malaysia', 'MY-07');
  const penang = cut(penangState, box(100.17, 5.2, 100.34, 5.51));
  const straits = union(penangState, atlas('malaysia', 'MY-04'));
  const singapore = modern('SGP');
  add('penang', 'Penang', company, 1786, 1800, penang);
  add('penang', 'Penang and Province Wellesley', company, 1800, 1826, penangState);
  add('straits', 'Straits Settlements', company, 1826, 1858, union(straits, singapore));
  add('straits', 'Straits Settlements under British India', colony, 1858, 1867, union(straits, singapore));
  add('straits', 'Straits Settlements', colony, 1867, 1946, union(straits, singapore));
  series('malaya', 'British-protected Malay states', protection, 1874, 1909, minus(malaya, straits));
  add('malaya', 'Federated and Unfederated Malay States', protection, 1909, 1946, minus(malaya, straits));
  add('malaya', 'Malayan Union', colony, 1946, 1948, malaya);
  add('malaya', 'Federation of Malaya', protection, 1948, 1957, malaya);
  add('singapore', 'Singapore', company, 1824, 1826, singapore);
  add('singapore', 'Singapore', colony, 1946, 1963, singapore);
  const sabah = atlas('malaysia', /^MY-(12|15)$/);
  const sarawak = atlas('malaysia', 'MY-13');
  series('sarawak', 'Raj of Sarawak', protection, 1888, 1905, sarawak);
  add('sarawak', 'Raj of Sarawak', protection, 1905, 1946, sarawak);
  add('sarawak', 'Sarawak', colony, 1946, 1963, sarawak);
  add('north-borneo', 'North Borneo', company, 1881, 1888, sabah);
  add('north-borneo', 'North Borneo', protection, 1888, 1946, sabah);
  add('north-borneo', 'North Borneo', colony, 1946, 1963, sabah);
  small('brunei', 'Brunei', 'BRN', 1888, 1984, protection);
  series('java', 'British administration of Java', company, 1811, 1816, cut(modern('IDN'), box(105, -9, 114.62, -5.7)));

  // The colonies of Australia and the Pacific. The mapped territorial claims
  // and annexations were distinct from Indigenous land ownership and control.
  const mainland = atlas('australia', /^AU-(NSW|VIC|QLD|SA|WA|NT|ACT|JBT)$/);
  const tasmania = atlas('australia', 'AU-TAS');
  const australiaNote = {note: 'The map shows the colony’s claimed administrative extent. Aboriginal and Torres Strait Islander peoples retained their own lands, communities and systems of law.'};
  const nsw1788 = cut(union(mainland, tasmania), box(135, -48, 155, -8));
  add('new-south-wales', 'New South Wales', colony, 1788, 1825, nsw1788, australiaNote);
  const easternAustralia = cut(mainland, box(129, -45, 155, -8));
  const westernAustralia = minus(mainland, easternAustralia);
  const southAustralia1836 = cut(easternAustralia, box(132, -39, 141, -26));
  const southAustralia = cut(easternAustralia, box(129, -39, 141, -26));
  const victoria = atlas('australia', 'AU-VIC');
  const queensland = atlas('australia', 'AU-QLD');
  const queensland1859 = cut(queensland, box(141, -30, 155, -8));
  const northernTerritory = atlas('australia', 'AU-NT');
  const nswPeriods = [
    [1825, 1836, []], [1836, 1851, [southAustralia1836]], [1851, 1859, [southAustralia1836, victoria]],
    [1859, 1861, [southAustralia1836, victoria, queensland1859]],
    [1861, 1862, [southAustralia, victoria, queensland1859]],
    [1862, 1863, [southAustralia, victoria, queensland]],
    [1863, 1901, [southAustralia, victoria, queensland, northernTerritory]]
  ];
  for (const [from, until, separated] of nswPeriods) {
    add('new-south-wales', 'New South Wales', colony, from, until, minus(easternAustralia, ...separated), australiaNote);
  }
  add('western-australia', 'Western Australia', colony, 1829, 1901, westernAustralia, australiaNote);
  add('tasmania', 'Van Diemen’s Land', colony, 1825, 1856, tasmania, australiaNote);
  add('tasmania', 'Tasmania', colony, 1856, 1901, tasmania, australiaNote);
  add('south-australia', 'South Australia', colony, 1836, 1861, southAustralia1836, australiaNote);
  add('south-australia', 'South Australia', colony, 1861, 1863, southAustralia, australiaNote);
  add('south-australia', 'South Australia and Northern Territory', colony, 1863, 1901,
    union(southAustralia, northernTerritory), australiaNote);
  add('victoria', 'Victoria', colony, 1851, 1901, victoria, australiaNote);
  add('queensland', 'Queensland', colony, 1859, 1862, queensland1859, australiaNote);
  add('queensland', 'Queensland', colony, 1862, 1901, queensland, australiaNote);
  add('australia', 'Commonwealth of Australia', dominion, 1901, 1942, union(mainland, tasmania), {
    note: 'Six colonies federated in 1901. Australia adopted the Statute of Westminster in 1942 with retrospective effect to September 1939. The Australia Acts completed the constitutional separation in 1986.'
  });
  add('norfolk', 'Norfolk Island', colony, 1788, 1814, atlas('australia', 'AU-NFK'));
  add('norfolk', 'Norfolk Island', colony, 1825, 1914, atlas('australia', 'AU-NFK'));
  const nz = cut(modern('NZL'), box(164, -54, 180, -29));
  add('new-zealand', 'New Zealand', colony, 1840, 1907, nz, {
    note: 'The Crown proclaimed sovereignty in 1840. The Treaty of Waitangi and its Māori and English texts remain central to understanding that claim.'
  });
  add('new-zealand', 'Dominion of New Zealand', dominion, 1907, 1947, nz);
  small('fiji', 'Fiji', 'FJI', 1874, 1881);
  small('fiji', 'Fiji', 'FJI', 1881, 1970);
  small('tonga', 'Tonga', 'TON', 1900, 1970, protection);
  small('solomons', 'British Solomon Islands', 'SLB', 1893, 1978, protection,
    'The protectorate expanded in the 1890s and gained northern islands by agreement with Germany. The outline uses the eventual island group.');
  small('vanuatu', 'New Hebrides', 'VUT', 1906, 1980, joint, 'A condominium jointly administered by Britain and France.');
  mandated('nauru', 'Nauru', modern('NRU'), 1920, 1947, 1968,
    'Mandate and later trusteeship of Australia, New Zealand and the United Kingdom, administered by Australia.');
  const papua = cut(modern('PNB', 'PNX'), box(140.9, -12, 156, -8));
  add('papua', 'British New Guinea', protection, 1884, 1888, papua);
  add('papua', 'British New Guinea', colony, 1888, 1906, papua, {
    note: 'The southern part of eastern New Guinea became the Australian-administered Territory of Papua in 1906. The early northern boundary is generalized.'
  });
  add('papua', 'Territory of Papua', 'Australian-administered territory', 1906, 1975, papua, {
    note: 'Australia administered Papua from 1906. It remained a British possession in law until Papua New Guinea became independent in 1975.'
  });
  const gilbert = cut(modern('KIR'), box(169, -4, 178, 5));
  const ocean = cut(modern('KIR'), box(169, -.91, 170, -.82));
  add('gilbert', 'Gilbert and Ellice Islands Protectorate', protection, 1892, 1916,
    union(minus(gilbert, ocean), modern('TUV')));
  add('gilbert', 'Gilbert and Ellice Islands Colony', colony, 1916, 1976, union(gilbert, modern('TUV')));
  add('gilbert', 'Gilbert Islands', colony, 1976, 1979, gilbert);
  small('tuvalu', 'Tuvalu', 'TUV', 1976, 1978);
  const kiribati = minus(modern('KIR'), gilbert);
  const christmasIsland = cut(kiribati, box(-158, 1.5, -156.5, 2.5));
  add('line-islands', 'Christmas Island (Kiritimati)', colony, 1888, 1916, christmasIsland);
  add('line-islands', 'British Line and Phoenix Islands', colony, 1916, 1979, kiribati, {
    note: 'Outlying islands administered with the Gilbert and Ellice Islands. Annexations and competing American claims differed by island. The map generalizes the grouping.'
  });
  small('cook-islands', 'Cook Islands', 'COK', 1888, 1901, protection);
  small('niue', 'Niue', 'NIU', 1900, 1901, protection);
  small('tokelau', 'Tokelau', 'TKL', 1889, 1926, protection);
  const pitcairn = gb('GB-O-PN');
  add('pitcairn', 'Pitcairn Island', colony, 1838, 1902, cut(pitcairn, box(-130.2, -25.2, -129.9, -24.9)));
  retained('pitcairn', 'Pitcairn Islands', pitcairn, 1902);
}

// A day is given when the cited source establishes it. Year-end snapshots
// can have an explanatory event even when the shape did not change.
export const events = [
  ['1707-05-01', 'Acts of Union', 'England and Scotland united as the Kingdom of Great Britain. Wales was already incorporated with England.', ['england', 'scotland', 'wales']],
  ['1713-04-11', 'Treaty of Utrecht', 'Britain secured Gibraltar and Minorca and received French claims to Newfoundland, Hudson Bay and Acadia, with fishing and boundary provisions.', ['newfoundland', 'british-north-america', 'kitts-nevis']],
  ['1763-02-10', 'Treaty of Paris', 'France ceded Canada to Britain and Spain ceded Florida. Britain also gained several Caribbean islands.', ['british-north-america', 'floridas', 'atlantic-colonies', 'dominica', 'grenada', 'saint-vincent', 'tobago', 'minorca']],
  ['1776-07-04', 'American Declaration of Independence', 'Thirteen colonies declared independence. Britain disputed the declaration and continued military operations until the peace.', ['atlantic-colonies']],
  ['1783-09-03', 'Peace of Paris', 'Britain recognized United States independence. Separate treaties restored East and West Florida to Spain and settled Caribbean possessions.', ['atlantic-colonies', 'floridas', 'grenada', 'dominica', 'saint-vincent']],
  ['1788-01-26', 'New South Wales', 'The First Fleet established a colony at Sydney Cove. The map shows the eastern claim, alongside the continued presence and sovereignty of Aboriginal peoples.', ['new-south-wales', 'norfolk']],
  ['1801-01-01', 'Union with Ireland', 'The Acts of Union took effect, creating the United Kingdom of Great Britain and Ireland.', ['ireland']],
  ['1840-05-21', 'New Zealand', 'Lieutenant-Governor William Hobson proclaimed British sovereignty over the islands in the year of the Treaty of Waitangi.', ['new-zealand']],
  ['1842-08-29', 'Treaty of Nanking', 'The Qing government ceded Hong Kong Island after the First Opium War.', ['hong-kong']],
  ['1846-06-15', 'Oregon Treaty', 'Britain and the United States divided the disputed Oregon Country, largely along the 49th parallel.', ['oregon']],
  ['1858-11-01', 'Crown rule in India', 'Queen Victoria’s proclamation transferred government from the East India Company to the Crown.', ['india', 'burma', 'aden']],
  ['1860-10-24', 'Convention of Peking', 'Southern Kowloon and Stonecutters Island came under British administration.', ['hong-kong']],
  ['1867-07-01', 'Canadian Confederation', 'Canada, Nova Scotia and New Brunswick formed a self-governing Dominion. The Province of Canada became Ontario and Quebec.', ['canada', 'nova-scotia', 'new-brunswick']],
  ['1870-07-15', 'Rupert’s Land', 'Rupert’s Land and the North-Western Territory transferred to the Dominion of Canada.', ['canada', 'ruperts-land', 'north-western-territory']],
  ['1881-05-13', 'Rotuma', 'Rotuma was ceded to Britain and incorporated into the Colony of Fiji.', ['fiji']],
  ['1898-07-01', 'Hong Kong New Territories', 'A 99-year lease enlarged the area under British administration.', ['hong-kong']],
  ['1901-01-01', 'Australian Federation', 'Six colonies formed the Commonwealth of Australia, a self-governing member of the empire.', ['australia', 'new-south-wales', 'victoria', 'queensland', 'south-australia', 'western-australia', 'tasmania']],
  ['1910-05-31', 'Union of South Africa', 'Four colonies federated as the self-governing Union of South Africa.', ['cape', 'south-africa']],
  ['1922-02-28', 'Egypt', 'Britain declared Egypt independent, with reserved powers. The formal protectorate ended.', ['egypt']],
  ['1922-12-06', 'Irish Free State', 'The Irish Free State came into existence. Northern Ireland exercised its option to remain in the United Kingdom.', ['ireland', 'northern-ireland']],
  ['1927-04-12', 'Royal and Parliamentary Titles Act', 'The Act gave formal effect to the name United Kingdom of Great Britain and Northern Ireland.', []],
  ['1927-03-01', 'Labrador boundary', 'The Judicial Committee of the Privy Council ruled that Newfoundland’s Labrador boundary followed the watershed inland.', ['canada', 'newfoundland']],
  ['1931-12-11', 'Statute of Westminster', 'The statute gave legislative independence to Canada and South Africa. Australia and New Zealand adopted it later, and Newfoundland never did.', ['canada', 'south-africa']],
  ['1947-08-15', 'Partition and independence', 'British rule in India ended with independence and partition into India and Pakistan.', ['india']],
  ['1947-11-25', 'New Zealand', 'New Zealand adopted the Statute of Westminster.', ['new-zealand']],
  ['1948-01-04', 'Burma', 'Burma became independent.', ['burma']],
  ['1948-05-14', 'Palestine', 'British administration ended at midnight on 14–15 May.', ['palestine']],
  ['1949-03-31', 'Newfoundland', 'Newfoundland joined Canada.', ['newfoundland']],
  ['1957-03-06', 'Ghana', 'The Gold Coast and British Togoland became independent together as Ghana.', ['gold-coast', 'togoland']],
  ['1957-08-31', 'Malaya', 'The Federation of Malaya became independent.', ['malaya']],
  ['1960-08-16', 'Cyprus', 'The Republic of Cyprus became independent. Britain retained Akrotiri and Dhekelia as Sovereign Base Areas.', ['cyprus', 'cyprus-bases']],
  ['1960-10-01', 'Nigeria', 'Nigeria became independent.', ['nigeria']],
  ['1961-06-01', 'Northern Cameroons', 'The northern territory joined Nigeria after a plebiscite.', ['northern-cameroons']],
  ['1961-10-01', 'Southern Cameroons', 'The southern territory joined Cameroon after a plebiscite.', ['southern-cameroons']],
  ['1963-09-16', 'Malaysia', 'Malaya, North Borneo (Sabah), Sarawak and Singapore formed Malaysia.', ['north-borneo', 'sarawak', 'singapore']],
  ['1965-11-08', 'Chagos Archipelago', 'Britain detached Chagos from Mauritius and Aldabra, Desroches and Farquhar from Seychelles to create the British Indian Ocean Territory.', ['chagos', 'seychelles']],
  ['1967-11-30', 'South Yemen', 'Aden and the former protected states became independent as South Yemen.', ['aden-protectorate']],
  ['1976-06-29', 'Seychelles', 'Seychelles became independent. Britain returned Aldabra, Desroches and Farquhar to Seychelles.', ['chagos', 'seychelles']],
  ['1997-07-01', 'Hong Kong', 'China resumed the exercise of sovereignty over Hong Kong, and British administration ended.', ['hong-kong']],
  ['2002-02-26', 'British Overseas Territories Act', 'The Act renamed the remaining British dependent territories as British overseas territories.', []],
  ['2025-05-22', 'Chagos agreement', 'The United Kingdom and Mauritius signed an agreement on sovereignty and the use of Diego Garcia. It had yet to take effect at year end.', []]
];
