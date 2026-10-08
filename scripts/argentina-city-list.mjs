// First 80 entries in the user-supplied ranking, retrieved 8 October 2026.
export const rankingURL='https://en.wikipedia.org/wiki/List_of_cities_in_Argentina_by_population';
export const cities=[
 ['Buenos Aires City','02','Ciudad Autónoma de Buenos Aires'],
 ['Córdoba','14'],['Rosario','82'],['La Plata','06'],['Mar del Plata','06','General Pueyrredón'],
 ['San Miguel de Tucumán','90'],['Salta','66'],['Santa Fe de la Vera Cruz','82','Santa Fe'],
 ['Vicente López','06'],['Corrientes','18'],['Pilar','06'],['Bahía Blanca','06'],['Resistencia','22'],
 ['Posadas','54'],['San Salvador de Jujuy','38'],['Santiago del Estero','86'],['Paraná','30'],
 ['Merlo','06'],['Neuquén','58'],['Quilmes','06'],['Banfield','06',null,'Lomas de Zamora'],
 ['Formosa','34'],['José C. Paz','06'],['Lanús','06'],['Godoy Cruz','50'],['Las Heras','50'],
 ['La Rioja','46'],['Gregorio de Laferrère','06',null,'La Matanza'],['Comodoro Rivadavia','26'],
 ['San Luis','74'],['Ituzaingó','06'],['Berazategui','06'],['González Catán','06',null,'La Matanza'],
 ['Ezeiza','06'],['San Fernando del Valle de Catamarca','10'],['San Miguel','06'],['Río Cuarto','14'],
 ['Concordia','30'],['Moreno','06'],['San Fernando de la Buena Vista','06','San Fernando'],
 ['Isidro Casanova','06',null,'La Matanza'],['San Nicolás de los Arroyos','06','San Nicolás'],
 ['Florencio Varela','06'],['San Rafael','50'],['Tandil','06'],['Mendoza','50'],['Avellaneda','06'],
 ['Lomas de Zamora','06'],['Temperley','06',null,'Lomas de Zamora'],['Villa Mercedes','74'],
 ['Olavarría','06'],['Monte Grande','06',null,'Esteban Echeverría'],['Bernal','06',null,'Quilmes'],
 ['San Carlos de Bariloche','62'],['San Juan','70'],['Villa Krause','70','Rawson'],['Maipú','50'],
 ['La Banda','86'],['San Justo','06',null,'La Matanza'],['Pergamino','06'],['Castelar','06',null,'Morón'],
 ['Rafael Castillo','06',null,'La Matanza'],['Santa Rosa','42'],['Libertad','06',null,'Merlo'],
 ['Ramos Mejía','06',null,'La Matanza'],['Trelew','26'],['Luján','06'],['Río Gallegos','78'],
 ['Caseros','06',null,'Tres de Febrero'],['Trujui','06',null,'Moreno'],['Morón','06'],['Rafaela','82'],
 ['Virrey del Pino','06',null,'La Matanza'],['Presidencia Roque Sáenz Peña','22'],
 ['Parque San Martín','06',null,'Merlo'],['Berisso','06'],['Junín','06'],['Chimbas','70'],
 ['Campana','06'],['Zárate','06']
].map(([name,province,municipality=name,localityParent],i)=>({rank:i+1,name,province,municipality,localityParent}));
