// US city quiz: cities (not metro areas) by cumulative difficulty. Each entry is
// [name, state code] or [name, state code, Census place name when it differs].
export const cityQuizLevels=[
 {id:'easy',label:'Easy',medal:'Bronze'},
 {id:'medium',label:'Medium',medal:'Silver'},
 {id:'hard',label:'Hard',medal:'Gold'},
 {id:'expert',label:'Expert',medal:'Platinum'},
 {id:'master',label:'Master',medal:'Diamond'}
];
export const cityQuizCities={
 easy:[['New York','NY'],['Los Angeles','CA'],['Chicago','IL'],['Houston','TX'],['Dallas','TX'],['Atlanta','GA'],['Miami','FL'],['Orlando','FL'],['Washington','DC'],['Boston','MA'],['Philadelphia','PA'],['San Francisco','CA'],['San Diego','CA'],['Seattle','WA'],['Las Vegas','NV'],['New Orleans','LA'],['Honolulu','HI','Urban Honolulu'],['Detroit','MI']],
 medium:[['Phoenix','AZ'],['San Antonio','TX'],['Austin','TX'],['Denver','CO'],['Nashville','TN','Nashville-Davidson metropolitan government (balance)'],['Portland','OR'],['Minneapolis','MN'],['Salt Lake City','UT'],['St. Louis','MO'],['Kansas City','MO'],['Baltimore','MD'],['Pittsburgh','PA'],['Charlotte','NC'],['Indianapolis','IN','Indianapolis city (balance)'],['Cleveland','OH'],['Tampa','FL'],['Memphis','TN'],['Anchorage','AK']],
 hard:[['San Jose','CA'],['Fort Worth','TX'],['Oakland','CA'],['Jacksonville','FL'],['Columbus','OH'],['Oklahoma City','OK'],['El Paso','TX'],['Louisville','KY','Louisville/Jefferson County metro government (balance)'],['Milwaukee','WI'],['Albuquerque','NM'],['Tucson','AZ'],['Sacramento','CA'],['Raleigh','NC'],['Omaha','NE'],['Cincinnati','OH'],['Buffalo','NY'],['Richmond','VA'],['Birmingham','AL'],['Providence','RI'],['Virginia Beach','VA'],['Tulsa','OK'],['Boise','ID','Boise City'],['Des Moines','IA'],['Little Rock','AR'],['Fresno','CA'],['Charleston','SC'],['Savannah','GA'],['Hartford','CT'],['Albany','NY'],['Baton Rouge','LA'],['Wichita','KS'],['Colorado Springs','CO']],
 expert:[['Arlington','TX'],['Long Beach','CA'],['Mesa','AZ'],['Aurora','CO'],['Anaheim','CA'],['Santa Ana','CA'],['Riverside','CA'],['Bakersfield','CA'],['St. Paul','MN'],['Newark','NJ'],['Jersey City','NJ'],['Plano','TX'],['Henderson','NV'],['Irvine','CA'],['St. Petersburg','FL'],['Durham','NC'],['Norfolk','VA'],['Tacoma','WA'],
  ['Rochester','NY'],['Grand Rapids','MI'],['Knoxville','TN'],['Lexington','KY','Lexington-Fayette'],['Corpus Christi','TX'],['Stockton','CA'],['Toledo','OH'],['Fort Wayne','IN'],['Laredo','TX'],['Lubbock','TX'],['Reno','NV'],['Spokane','WA'],['Huntsville','AL'],['Chattanooga','TN'],['Dayton','OH'],['Akron','OH'],['Syracuse','NY'],['Worcester','MA'],['New Haven','CT'],['Bridgeport','CT'],['Allentown','PA'],['Provo','UT'],['Greensboro','NC'],['Greenville','SC'],['Shreveport','LA'],
  ['Jackson','MS'],['Sioux Falls','SD'],['Fargo','ND'],['Billings','MT'],['Manchester','NH'],['Burlington','VT'],['Portland','ME'],['Wilmington','DE'],['Charleston','WV'],
  ['Lincoln','NE'],['Madison','WI'],['Columbia','SC'],['Tallahassee','FL'],['Montgomery','AL'],['Cheyenne','WY'],['Harrisburg','PA'],['Trenton','NJ'],['Santa Fe','NM'],['Salem','OR'],['Lansing','MI'],['Topeka','KS'],['Springfield','IL'],['Fairbanks','AK']],
 master:[['Juneau','AK'],['Dover','DE'],['Frankfort','KY'],['Augusta','ME'],['Jefferson City','MO'],['Helena','MT'],['Carson City','NV'],['Concord','NH'],['Bismarck','ND'],['Pierre','SD'],['Montpelier','VT'],['Olympia','WA'],['Annapolis','MD'],
  ['Chula Vista','CA'],['Fremont','CA'],['San Bernardino','CA'],['Modesto','CA'],['Fontana','CA'],['Moreno Valley','CA'],['Oxnard','CA'],['Huntington Beach','CA'],['Glendale','CA'],['Santa Clarita','CA'],['Oceanside','CA'],['Ontario','CA'],['Rancho Cucamonga','CA'],['Elk Grove','CA'],['Garden Grove','CA'],['Santa Rosa','CA'],['Pasadena','CA'],['Berkeley','CA'],['Santa Barbara','CA'],['Palm Springs','CA'],
  ['Chandler','AZ'],['Scottsdale','AZ'],['Glendale','AZ'],['Gilbert','AZ'],['Tempe','AZ'],['Flagstaff','AZ'],['North Las Vegas','NV'],
  ['Irving','TX'],['Garland','TX'],['Grand Prairie','TX'],['McKinney','TX'],['Frisco','TX'],['Brownsville','TX'],['Amarillo','TX'],['Killeen','TX'],['Waco','TX'],['Midland','TX'],
  ['Hialeah','FL'],['Port St. Lucie','FL'],['Cape Coral','FL'],['Fort Lauderdale','FL'],['Pembroke Pines','FL'],['Gainesville','FL'],['Pensacola','FL'],['Key West','FL'],
  ['Chesapeake','VA'],['Winston-Salem','NC'],['Fayetteville','NC'],['Asheville','NC'],['Augusta','GA','Augusta-Richmond County consolidated government (balance)'],['Columbus','GA'],['Macon','GA','Macon-Bibb County'],['Mobile','AL'],['Clarksville','TN'],['Murfreesboro','TN'],['Lafayette','LA'],
  ['Yonkers','NY'],['Paterson','NJ'],['Elizabeth','NJ'],['Stamford','CT'],['Cambridge','MA'],['Lowell','MA'],['Springfield','MA'],['Scranton','PA'],
  ['Overland Park','KS'],['Kansas City','KS'],['Aurora','IL'],['Naperville','IL'],['Joliet','IL'],['Rockford','IL'],['Ann Arbor','MI'],['Evansville','IN'],['South Bend','IN'],['Cedar Rapids','IA'],['Green Bay','WI'],['Duluth','MN'],['Rapid City','SD'],
  ['Vancouver','WA'],['Bellevue','WA'],['Boulder','CO'],['Fort Collins','CO'],['Eugene','OR'],['Ogden','UT'],['St. George','UT'],['Missoula','MT']]
};
// Accepted answers beyond the name itself and "Name, State".
export const cityQuizAliases={'New York':['New York City','NYC'],'Los Angeles':['LA','L.A.'],'Washington':['Washington DC','Washington, D.C.','DC'],'San Francisco':['SF'],'Las Vegas':['Vegas'],'Philadelphia':['Philly'],'New Orleans':['NOLA'],'Salt Lake City':['SLC'],'Oklahoma City':['OKC']};
