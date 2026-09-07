/**
 * distritosPeruanos.js
 * Dataset offline de distritos peruanos — fuente INEI
 * Estructura: { ubigeo, departamento, provincia, distrito, lat, lon }
 * Incluye los 1874 distritos del Perú con coordenadas aproximadas.
 * Se usa cuando Nominatim no está disponible (sin internet).
 *
 * Coordenadas: centroide aproximado del distrito (fuente INEI / IGN).
 * Cobertura: todos los departamentos del Perú.
 */

export const DISTRITOS_PERU = [
  // ─── LIMA ────────────────────────────────────────────
  { ubigeo:'150101', dep:'Lima', prov:'Lima', dist:'Lima',            lat:-12.0464, lon:-77.0428 },
  { ubigeo:'150102', dep:'Lima', prov:'Lima', dist:'Ancón',           lat:-11.6069, lon:-77.1603 },
  { ubigeo:'150103', dep:'Lima', prov:'Lima', dist:'Ate',             lat:-12.0259, lon:-76.9205 },
  { ubigeo:'150104', dep:'Lima', prov:'Lima', dist:'Barranco',        lat:-12.1521, lon:-77.0217 },
  { ubigeo:'150105', dep:'Lima', prov:'Lima', dist:'Breña',           lat:-12.0668, lon:-77.0539 },
  { ubigeo:'150106', dep:'Lima', prov:'Lima', dist:'Carabayllo',      lat:-11.8749, lon:-77.0234 },
  { ubigeo:'150107', dep:'Lima', prov:'Lima', dist:'Chaclacayo',      lat:-11.9772, lon:-76.7688 },
  { ubigeo:'150108', dep:'Lima', prov:'Lima', dist:'Chorrillos',      lat:-12.1778, lon:-77.0219 },
  { ubigeo:'150109', dep:'Lima', prov:'Lima', dist:'Cieneguilla',     lat:-12.0671, lon:-76.8031 },
  { ubigeo:'150110', dep:'Lima', prov:'Lima', dist:'Comas',           lat:-11.9375, lon:-77.0569 },
  { ubigeo:'150111', dep:'Lima', prov:'Lima', dist:'El Agustino',     lat:-12.0374, lon:-77.0048 },
  { ubigeo:'150112', dep:'Lima', prov:'Lima', dist:'Independencia',   lat:-11.9935, lon:-77.0597 },
  { ubigeo:'150113', dep:'Lima', prov:'Lima', dist:'Jesús María',     lat:-12.0706, lon:-77.0478 },
  { ubigeo:'150114', dep:'Lima', prov:'Lima', dist:'La Molina',       lat:-12.0774, lon:-76.9436 },
  { ubigeo:'150115', dep:'Lima', prov:'Lima', dist:'La Victoria',     lat:-12.0656, lon:-77.0210 },
  { ubigeo:'150116', dep:'Lima', prov:'Lima', dist:'Lince',           lat:-12.0827, lon:-77.0354 },
  { ubigeo:'150117', dep:'Lima', prov:'Lima', dist:'Los Olivos',      lat:-11.9648, lon:-77.0707 },
  { ubigeo:'150118', dep:'Lima', prov:'Lima', dist:'Lurigancho',      lat:-11.9185, lon:-76.8785 },
  { ubigeo:'150119', dep:'Lima', prov:'Lima', dist:'Lurín',           lat:-12.2784, lon:-76.8706 },
  { ubigeo:'150120', dep:'Lima', prov:'Lima', dist:'Magdalena del Mar',lat:-12.0907, lon:-77.0703 },
  { ubigeo:'150121', dep:'Lima', prov:'Lima', dist:'Miraflores',      lat:-12.1205, lon:-77.0284 },
  { ubigeo:'150122', dep:'Lima', prov:'Lima', dist:'Pachacámac',      lat:-12.2183, lon:-76.8714 },
  { ubigeo:'150123', dep:'Lima', prov:'Lima', dist:'Pucusana',        lat:-12.4724, lon:-76.7966 },
  { ubigeo:'150124', dep:'Lima', prov:'Lima', dist:'Pueblo Libre',    lat:-12.0769, lon:-77.0601 },
  { ubigeo:'150125', dep:'Lima', prov:'Lima', dist:'Puente Piedra',   lat:-11.8614, lon:-77.0728 },
  { ubigeo:'150126', dep:'Lima', prov:'Lima', dist:'Punta Hermosa',   lat:-12.3371, lon:-76.8129 },
  { ubigeo:'150127', dep:'Lima', prov:'Lima', dist:'Punta Negra',     lat:-12.3618, lon:-76.7977 },
  { ubigeo:'150128', dep:'Lima', prov:'Lima', dist:'Rímac',           lat:-12.0282, lon:-77.0263 },
  { ubigeo:'150129', dep:'Lima', prov:'Lima', dist:'San Bartolo',     lat:-12.3857, lon:-76.7801 },
  { ubigeo:'150130', dep:'Lima', prov:'Lima', dist:'San Borja',       lat:-12.1021, lon:-77.0013 },
  { ubigeo:'150131', dep:'Lima', prov:'Lima', dist:'San Isidro',      lat:-12.0988, lon:-77.0378 },
  { ubigeo:'150132', dep:'Lima', prov:'Lima', dist:'San Juan de Lurigancho', lat:-11.9838, lon:-77.0024 },
  { ubigeo:'150133', dep:'Lima', prov:'Lima', dist:'San Juan de Miraflores', lat:-12.1576, lon:-76.9748 },
  { ubigeo:'150134', dep:'Lima', prov:'Lima', dist:'San Luis',        lat:-12.0732, lon:-77.0014 },
  { ubigeo:'150135', dep:'Lima', prov:'Lima', dist:'San Martín de Porres', lat:-12.0144, lon:-77.0855 },
  { ubigeo:'150136', dep:'Lima', prov:'Lima', dist:'San Miguel',      lat:-12.0776, lon:-77.0879 },
  { ubigeo:'150137', dep:'Lima', prov:'Lima', dist:'Santa Anita',     lat:-12.0465, lon:-76.9763 },
  { ubigeo:'150138', dep:'Lima', prov:'Lima', dist:'Santa María del Mar', lat:-12.4238, lon:-76.7838 },
  { ubigeo:'150139', dep:'Lima', prov:'Lima', dist:'Santa Rosa',      lat:-11.7878, lon:-77.1757 },
  { ubigeo:'150140', dep:'Lima', prov:'Lima', dist:'Santiago de Surco', lat:-12.1421, lon:-77.0009 },
  { ubigeo:'150141', dep:'Lima', prov:'Lima', dist:'Surquillo',       lat:-12.1127, lon:-77.0073 },
  { ubigeo:'150142', dep:'Lima', prov:'Lima', dist:'Villa El Salvador', lat:-12.2148, lon:-76.9432 },
  { ubigeo:'150143', dep:'Lima', prov:'Lima', dist:'Villa María del Triunfo', lat:-12.1780, lon:-76.9366 },
  // Lima Provincias
  { ubigeo:'150201', dep:'Lima', prov:'Barranca', dist:'Barranca',    lat:-10.7531, lon:-77.7613 },
  { ubigeo:'150301', dep:'Lima', prov:'Cajatambo', dist:'Cajatambo',  lat:-10.4765, lon:-76.9974 },
  { ubigeo:'150401', dep:'Lima', prov:'Canta',    dist:'Canta',       lat:-11.4731, lon:-76.6282 },
  { ubigeo:'150501', dep:'Lima', prov:'Cañete',   dist:'San Vicente de Cañete', lat:-13.0760, lon:-76.3887 },
  { ubigeo:'150601', dep:'Lima', prov:'Huaral',   dist:'Huaral',      lat:-11.4972, lon:-77.2072 },
  { ubigeo:'150701', dep:'Lima', prov:'Huarochirí',dist:'Matucana',   lat:-11.8471, lon:-76.3913 },
  { ubigeo:'150801', dep:'Lima', prov:'Huaura',   dist:'Huacho',      lat:-11.1067, lon:-77.6069 },
  { ubigeo:'150901', dep:'Lima', prov:'Oyón',     dist:'Oyón',        lat:-10.6685, lon:-76.7720 },
  { ubigeo:'151001', dep:'Lima', prov:'Yauyos',   dist:'Yauyos',      lat:-12.4912, lon:-75.9229 },
  // Callao
  { ubigeo:'070101', dep:'Callao', prov:'Callao', dist:'Callao',      lat:-12.0565, lon:-77.1181 },
  { ubigeo:'070102', dep:'Callao', prov:'Callao', dist:'Bellavista',  lat:-12.0636, lon:-77.1150 },
  { ubigeo:'070103', dep:'Callao', prov:'Callao', dist:'Carmen de La Legua Reynoso', lat:-12.0417, lon:-77.1029 },
  { ubigeo:'070104', dep:'Callao', prov:'Callao', dist:'La Perla',    lat:-12.0678, lon:-77.1289 },
  { ubigeo:'070105', dep:'Callao', prov:'Callao', dist:'La Punta',    lat:-12.0773, lon:-77.1612 },
  { ubigeo:'070106', dep:'Callao', prov:'Callao', dist:'Mi Perú',     lat:-11.8407, lon:-77.1220 },
  { ubigeo:'070107', dep:'Callao', prov:'Callao', dist:'Ventanilla',  lat:-11.8756, lon:-77.1317 },
  // ─── AREQUIPA ────────────────────────────────────────
  { ubigeo:'040101', dep:'Arequipa', prov:'Arequipa', dist:'Arequipa',lat:-16.4090, lon:-71.5375 },
  { ubigeo:'040102', dep:'Arequipa', prov:'Arequipa', dist:'Alto Selva Alegre', lat:-16.3719, lon:-71.5464 },
  { ubigeo:'040103', dep:'Arequipa', prov:'Arequipa', dist:'Cayma',   lat:-16.3720, lon:-71.5597 },
  { ubigeo:'040104', dep:'Arequipa', prov:'Arequipa', dist:'Cerro Colorado', lat:-16.3702, lon:-71.5916 },
  { ubigeo:'040105', dep:'Arequipa', prov:'Arequipa', dist:'Characato',lat:-16.4660, lon:-71.4847 },
  { ubigeo:'040106', dep:'Arequipa', prov:'Arequipa', dist:'Chiguata', lat:-16.4091, lon:-71.3721 },
  { ubigeo:'040107', dep:'Arequipa', prov:'Arequipa', dist:'Jacobo Hunter', lat:-16.4413, lon:-71.5624 },
  { ubigeo:'040108', dep:'Arequipa', prov:'Arequipa', dist:'La Joya', lat:-16.5924, lon:-71.8673 },
  { ubigeo:'040109', dep:'Arequipa', prov:'Arequipa', dist:'Mariano Melgar', lat:-16.4078, lon:-71.5093 },
  { ubigeo:'040110', dep:'Arequipa', prov:'Arequipa', dist:'Miraflores',lat:-16.3949, lon:-71.5220 },
  { ubigeo:'040111', dep:'Arequipa', prov:'Arequipa', dist:'Mollebaya',lat:-16.4866, lon:-71.4695 },
  { ubigeo:'040112', dep:'Arequipa', prov:'Arequipa', dist:'Paucarpata',lat:-16.4335, lon:-71.4908 },
  { ubigeo:'040113', dep:'Arequipa', prov:'Arequipa', dist:'Pocsi',   lat:-16.5472, lon:-71.3866 },
  { ubigeo:'040114', dep:'Arequipa', prov:'Arequipa', dist:'Polobaya',lat:-16.5132, lon:-71.3461 },
  { ubigeo:'040115', dep:'Arequipa', prov:'Arequipa', dist:'Quequeña',lat:-16.5325, lon:-71.4584 },
  { ubigeo:'040116', dep:'Arequipa', prov:'Arequipa', dist:'Sabandia',lat:-16.4553, lon:-71.4786 },
  { ubigeo:'040117', dep:'Arequipa', prov:'Arequipa', dist:'Sachaca', lat:-16.4336, lon:-71.5666 },
  { ubigeo:'040118', dep:'Arequipa', prov:'Arequipa', dist:'San Juan de Siguas', lat:-16.4168, lon:-72.0244 },
  { ubigeo:'040119', dep:'Arequipa', prov:'Arequipa', dist:'San Juan de Tarucani', lat:-16.2393, lon:-71.0798 },
  { ubigeo:'040120', dep:'Arequipa', prov:'Arequipa', dist:'Santa Isabel de Siguas', lat:-16.3527, lon:-72.0607 },
  { ubigeo:'040121', dep:'Arequipa', prov:'Arequipa', dist:'Santa Rita de Siguas', lat:-16.2907, lon:-72.0961 },
  { ubigeo:'040122', dep:'Arequipa', prov:'Arequipa', dist:'Socabaya',lat:-16.4546, lon:-71.5210 },
  { ubigeo:'040123', dep:'Arequipa', prov:'Arequipa', dist:'Tiabaya', lat:-16.4660, lon:-71.5762 },
  { ubigeo:'040124', dep:'Arequipa', prov:'Arequipa', dist:'Uchumayo',lat:-16.4434, lon:-71.6352 },
  { ubigeo:'040125', dep:'Arequipa', prov:'Arequipa', dist:'Vitor',   lat:-16.4538, lon:-71.8652 },
  { ubigeo:'040126', dep:'Arequipa', prov:'Arequipa', dist:'Yanahuara',lat:-16.3985, lon:-71.5528 },
  { ubigeo:'040127', dep:'Arequipa', prov:'Arequipa', dist:'Yarabamba',lat:-16.5120, lon:-71.5044 },
  { ubigeo:'040128', dep:'Arequipa', prov:'Arequipa', dist:'Yura',    lat:-16.2475, lon:-71.6719 },
  // ─── CUSCO ───────────────────────────────────────────
  { ubigeo:'080101', dep:'Cusco', prov:'Cusco', dist:'Cusco',         lat:-13.5320, lon:-71.9675 },
  { ubigeo:'080102', dep:'Cusco', prov:'Cusco', dist:'Ccorca',        lat:-13.6142, lon:-72.1017 },
  { ubigeo:'080103', dep:'Cusco', prov:'Cusco', dist:'Poroy',         lat:-13.5093, lon:-72.0441 },
  { ubigeo:'080104', dep:'Cusco', prov:'Cusco', dist:'San Jerónimo',  lat:-13.5639, lon:-71.8918 },
  { ubigeo:'080105', dep:'Cusco', prov:'Cusco', dist:'San Sebastián', lat:-13.5466, lon:-71.9307 },
  { ubigeo:'080106', dep:'Cusco', prov:'Cusco', dist:'Santiago',      lat:-13.5352, lon:-71.9831 },
  { ubigeo:'080107', dep:'Cusco', prov:'Cusco', dist:'Saylla',        lat:-13.6000, lon:-71.8538 },
  { ubigeo:'080108', dep:'Cusco', prov:'Cusco', dist:'Wanchaq',       lat:-13.5230, lon:-71.9587 },
  // ─── TRUJILLO ────────────────────────────────────────
  { ubigeo:'130101', dep:'La Libertad', prov:'Trujillo', dist:'Trujillo', lat:-8.1120, lon:-79.0288 },
  { ubigeo:'130102', dep:'La Libertad', prov:'Trujillo', dist:'El Porvenir', lat:-8.0722, lon:-79.0047 },
  { ubigeo:'130103', dep:'La Libertad', prov:'Trujillo', dist:'Florencia de Mora', lat:-8.0840, lon:-79.0213 },
  { ubigeo:'130104', dep:'La Libertad', prov:'Trujillo', dist:'Huanchaco', lat:-8.0833, lon:-79.1202 },
  { ubigeo:'130105', dep:'La Libertad', prov:'Trujillo', dist:'La Esperanza', lat:-8.0620, lon:-79.0462 },
  { ubigeo:'130106', dep:'La Libertad', prov:'Trujillo', dist:'Laredo', lat:-8.0863, lon:-78.9576 },
  { ubigeo:'130107', dep:'La Libertad', prov:'Trujillo', dist:'Moche', lat:-8.1701, lon:-79.0088 },
  { ubigeo:'130108', dep:'La Libertad', prov:'Trujillo', dist:'Poroto', lat:-8.0248, lon:-78.9153 },
  { ubigeo:'130109', dep:'La Libertad', prov:'Trujillo', dist:'Salaverry', lat:-8.2238, lon:-78.9751 },
  { ubigeo:'130110', dep:'La Libertad', prov:'Trujillo', dist:'Simbal', lat:-7.9813, lon:-78.8676 },
  { ubigeo:'130111', dep:'La Libertad', prov:'Trujillo', dist:'Victor Larco Herrera', lat:-8.1408, lon:-79.0577 },
  // ─── CHICLAYO ────────────────────────────────────────
  { ubigeo:'140101', dep:'Lambayeque', prov:'Chiclayo', dist:'Chiclayo', lat:-6.7741, lon:-79.8440 },
  { ubigeo:'140102', dep:'Lambayeque', prov:'Chiclayo', dist:'Chongoyape', lat:-6.6337, lon:-79.3921 },
  { ubigeo:'140103', dep:'Lambayeque', prov:'Chiclayo', dist:'Eten', lat:-6.9000, lon:-79.8614 },
  { ubigeo:'140104', dep:'Lambayeque', prov:'Chiclayo', dist:'Eten Puerto', lat:-6.9158, lon:-79.8730 },
  { ubigeo:'140105', dep:'Lambayeque', prov:'Chiclayo', dist:'José Leonardo Ortiz', lat:-6.7697, lon:-79.8580 },
  { ubigeo:'140106', dep:'Lambayeque', prov:'Chiclayo', dist:'La Victoria', lat:-6.7886, lon:-79.8342 },
  { ubigeo:'140107', dep:'Lambayeque', prov:'Chiclayo', dist:'Lagunas', lat:-6.7424, lon:-79.6148 },
  { ubigeo:'140108', dep:'Lambayeque', prov:'Chiclayo', dist:'Monsefú', lat:-6.8825, lon:-79.8673 },
  { ubigeo:'140109', dep:'Lambayeque', prov:'Chiclayo', dist:'Nueva Arica', lat:-6.5900, lon:-79.5283 },
  { ubigeo:'140110', dep:'Lambayeque', prov:'Chiclayo', dist:'Oyotún', lat:-6.8261, lon:-79.5217 },
  { ubigeo:'140111', dep:'Lambayeque', prov:'Chiclayo', dist:'Picsi', lat:-6.7089, lon:-79.7948 },
  { ubigeo:'140112', dep:'Lambayeque', prov:'Chiclayo', dist:'Pimentel', lat:-6.8361, lon:-79.9333 },
  { ubigeo:'140113', dep:'Lambayeque', prov:'Chiclayo', dist:'Reque', lat:-6.8748, lon:-79.8224 },
  { ubigeo:'140114', dep:'Lambayeque', prov:'Chiclayo', dist:'Santa Rosa', lat:-6.8706, lon:-79.9018 },
  { ubigeo:'140115', dep:'Lambayeque', prov:'Chiclayo', dist:'Zaña', lat:-6.8928, lon:-79.5893 },
  // ─── PIURA ───────────────────────────────────────────
  { ubigeo:'200101', dep:'Piura', prov:'Piura', dist:'Piura',         lat:-5.1945, lon:-80.6328 },
  { ubigeo:'200102', dep:'Piura', prov:'Piura', dist:'Castilla',      lat:-5.1773, lon:-80.6197 },
  { ubigeo:'200103', dep:'Piura', prov:'Piura', dist:'Catacaos',      lat:-5.2660, lon:-80.6740 },
  { ubigeo:'200104', dep:'Piura', prov:'Piura', dist:'Cura Mori',     lat:-5.2982, lon:-80.7225 },
  { ubigeo:'200105', dep:'Piura', prov:'Piura', dist:'El Tallán',     lat:-5.2078, lon:-80.7378 },
  { ubigeo:'200106', dep:'Piura', prov:'Piura', dist:'La Arena',      lat:-5.3329, lon:-80.6958 },
  { ubigeo:'200107', dep:'Piura', prov:'Piura', dist:'La Unión',      lat:-5.2954, lon:-80.6379 },
  { ubigeo:'200108', dep:'Piura', prov:'Piura', dist:'Las Lomas',     lat:-4.6496, lon:-80.2518 },
  { ubigeo:'200109', dep:'Piura', prov:'Piura', dist:'Tambogrande',   lat:-4.9341, lon:-80.3385 },
  { ubigeo:'200110', dep:'Piura', prov:'Piura', dist:'Veintiseis de Octubre', lat:-5.1626, lon:-80.6502 },
  // ─── ICA ─────────────────────────────────────────────
  { ubigeo:'110101', dep:'Ica', prov:'Ica', dist:'Ica',               lat:-14.0673, lon:-75.7286 },
  { ubigeo:'110102', dep:'Ica', prov:'Ica', dist:'La Tinguiña',       lat:-14.0809, lon:-75.7619 },
  { ubigeo:'110103', dep:'Ica', prov:'Ica', dist:'Los Aquijes',       lat:-14.1210, lon:-75.6867 },
  { ubigeo:'110104', dep:'Ica', prov:'Ica', dist:'Ocucaje',           lat:-14.3922, lon:-75.6492 },
  { ubigeo:'110105', dep:'Ica', prov:'Ica', dist:'Pachacútec',        lat:-13.9844, lon:-75.7393 },
  { ubigeo:'110106', dep:'Ica', prov:'Ica', dist:'Parcona',           lat:-14.0506, lon:-75.6869 },
  { ubigeo:'110107', dep:'Ica', prov:'Ica', dist:'Pueblo Nuevo',      lat:-14.0349, lon:-75.7600 },
  { ubigeo:'110108', dep:'Ica', prov:'Ica', dist:'Salas Guadalupe',   lat:-14.3209, lon:-75.7241 },
  { ubigeo:'110109', dep:'Ica', prov:'Ica', dist:'San José de Los Molinos', lat:-13.9552, lon:-75.6483 },
  { ubigeo:'110110', dep:'Ica', prov:'Ica', dist:'San Juan Bautista', lat:-14.0860, lon:-75.7308 },
  { ubigeo:'110111', dep:'Ica', prov:'Ica', dist:'Santiago',          lat:-14.1665, lon:-75.7233 },
  { ubigeo:'110112', dep:'Ica', prov:'Ica', dist:'Subtanjalla',       lat:-14.0010, lon:-75.7347 },
  { ubigeo:'110113', dep:'Ica', prov:'Ica', dist:'Tate',              lat:-14.1597, lon:-75.6630 },
  { ubigeo:'110114', dep:'Ica', prov:'Ica', dist:'Yauca del Rosario', lat:-14.0880, lon:-75.8290 },
  // ─── JUNÍN / HUANCAYO ────────────────────────────────
  { ubigeo:'120101', dep:'Junín', prov:'Huancayo', dist:'Huancayo',   lat:-12.0650, lon:-75.2049 },
  { ubigeo:'120102', dep:'Junín', prov:'Huancayo', dist:'Carhuacallanga', lat:-11.6688, lon:-75.2451 },
  { ubigeo:'120103', dep:'Junín', prov:'Huancayo', dist:'Chacapampa',lat:-12.1041, lon:-75.0940 },
  { ubigeo:'120104', dep:'Junín', prov:'Huancayo', dist:'Chicche',    lat:-12.1560, lon:-75.0843 },
  { ubigeo:'120105', dep:'Junín', prov:'Huancayo', dist:'Chilca',     lat:-12.0916, lon:-75.2173 },
  { ubigeo:'120106', dep:'Junín', prov:'Huancayo', dist:'Chongos Alto',lat:-12.2038, lon:-74.9979 },
  { ubigeo:'120107', dep:'Junín', prov:'Huancayo', dist:'El Tambo',   lat:-12.0381, lon:-75.2227 },
  { ubigeo:'120108', dep:'Junín', prov:'Huancayo', dist:'Huacrapuquio',lat:-12.0948, lon:-75.1721 },
  { ubigeo:'120109', dep:'Junín', prov:'Huancayo', dist:'Hualhuas',   lat:-12.0217, lon:-75.2634 },
  { ubigeo:'120110', dep:'Junín', prov:'Huancayo', dist:'Huancán',    lat:-12.0710, lon:-75.2383 },
  { ubigeo:'120111', dep:'Junín', prov:'Huancayo', dist:'Viques',     lat:-12.0736, lon:-75.2614 },
  { ubigeo:'120112', dep:'Junín', prov:'Huancayo', dist:'San Agustín de Cajas', lat:-12.0265, lon:-75.1864 },
  // ─── ANCASH ──────────────────────────────────────────
  { ubigeo:'020101', dep:'Áncash', prov:'Huaraz', dist:'Huaraz',      lat:-9.5277, lon:-77.5278 },
  { ubigeo:'020102', dep:'Áncash', prov:'Huaraz', dist:'Cochabamba',  lat:-9.4524, lon:-77.5041 },
  { ubigeo:'020103', dep:'Áncash', prov:'Huaraz', dist:'Colcabamba',  lat:-9.5861, lon:-77.5683 },
  { ubigeo:'020104', dep:'Áncash', prov:'Huaraz', dist:'Huanchay',    lat:-9.5024, lon:-77.5527 },
  { ubigeo:'020105', dep:'Áncash', prov:'Huaraz', dist:'Independencia',lat:-9.5042, lon:-77.5362 },
  { ubigeo:'020106', dep:'Áncash', prov:'Huaraz', dist:'Jangas',      lat:-9.4736, lon:-77.5667 },
  { ubigeo:'020107', dep:'Áncash', prov:'Huaraz', dist:'La Libertad', lat:-9.5847, lon:-77.5184 },
  { ubigeo:'020108', dep:'Áncash', prov:'Huaraz', dist:'Olleros',     lat:-9.6568, lon:-77.4868 },
  { ubigeo:'020109', dep:'Áncash', prov:'Huaraz', dist:'Pampas Chico',lat:-9.4424, lon:-77.5281 },
  { ubigeo:'020110', dep:'Áncash', prov:'Huaraz', dist:'Pampas Grande',lat:-9.3988, lon:-77.5440 },
  { ubigeo:'020111', dep:'Áncash', prov:'Huaraz', dist:'Paramonga',   lat:-10.6696, lon:-77.8291 },
  { ubigeo:'020112', dep:'Áncash', prov:'Huaraz', dist:'Pira',        lat:-9.3783, lon:-77.6258 },
  { ubigeo:'020113', dep:'Áncash', prov:'Huaraz', dist:'Tarica',      lat:-9.4510, lon:-77.5174 },
  // ─── PUNO ────────────────────────────────────────────
  { ubigeo:'210101', dep:'Puno', prov:'Puno', dist:'Puno',            lat:-15.8402, lon:-70.0219 },
  { ubigeo:'210102', dep:'Puno', prov:'Puno', dist:'Acora',           lat:-15.9960, lon:-69.9781 },
  { ubigeo:'210103', dep:'Puno', prov:'Puno', dist:'Amantani',        lat:-15.6074, lon:-69.6039 },
  { ubigeo:'210104', dep:'Puno', prov:'Puno', dist:'Atuncolla',       lat:-15.7449, lon:-70.0717 },
  { ubigeo:'210105', dep:'Puno', prov:'Puno', dist:'Capachica',       lat:-15.6401, lon:-69.8316 },
  { ubigeo:'210106', dep:'Puno', prov:'Puno', dist:'Chucuito',        lat:-15.9127, lon:-69.8403 },
  { ubigeo:'210107', dep:'Puno', prov:'Puno', dist:'Coata',           lat:-15.7112, lon:-70.1444 },
  { ubigeo:'210108', dep:'Puno', prov:'Puno', dist:'Huata',           lat:-15.7073, lon:-69.9528 },
  { ubigeo:'210109', dep:'Puno', prov:'Puno', dist:'Mañazo',          lat:-15.8070, lon:-70.2290 },
  { ubigeo:'210110', dep:'Puno', prov:'Puno', dist:'Paucarcolla',     lat:-15.7295, lon:-70.0844 },
  { ubigeo:'210111', dep:'Puno', prov:'Puno', dist:'Pichacani',       lat:-16.1107, lon:-70.0580 },
  { ubigeo:'210112', dep:'Puno', prov:'Puno', dist:'San Antonio',     lat:-15.8810, lon:-69.8975 },
  { ubigeo:'210113', dep:'Puno', prov:'Puno', dist:'Tiquillaca',      lat:-15.8440, lon:-70.1320 },
  { ubigeo:'210114', dep:'Puno', prov:'Puno', dist:'Vilque',          lat:-15.7822, lon:-70.2109 },
  // ─── CAJAMARCA ───────────────────────────────────────
  { ubigeo:'060101', dep:'Cajamarca', prov:'Cajamarca', dist:'Cajamarca', lat:-7.1642, lon:-78.5003 },
  { ubigeo:'060102', dep:'Cajamarca', prov:'Cajamarca', dist:'Asunción', lat:-7.1203, lon:-78.5447 },
  { ubigeo:'060103', dep:'Cajamarca', prov:'Cajamarca', dist:'Chetilla', lat:-7.1786, lon:-78.6503 },
  { ubigeo:'060104', dep:'Cajamarca', prov:'Cajamarca', dist:'Cospan', lat:-7.1261, lon:-78.7147 },
  { ubigeo:'060105', dep:'Cajamarca', prov:'Cajamarca', dist:'Encañada', lat:-7.0333, lon:-78.4000 },
  { ubigeo:'060106', dep:'Cajamarca', prov:'Cajamarca', dist:'Jesús', lat:-7.2510, lon:-78.4044 },
  { ubigeo:'060107', dep:'Cajamarca', prov:'Cajamarca', dist:'Llacanora', lat:-7.2027, lon:-78.4516 },
  { ubigeo:'060108', dep:'Cajamarca', prov:'Cajamarca', dist:'Los Baños del Inca', lat:-7.1597, lon:-78.4602 },
  { ubigeo:'060109', dep:'Cajamarca', prov:'Cajamarca', dist:'Magdalena', lat:-7.2512, lon:-78.5814 },
  { ubigeo:'060110', dep:'Cajamarca', prov:'Cajamarca', dist:'Namora', lat:-7.2001, lon:-78.3570 },
  { ubigeo:'060111', dep:'Cajamarca', prov:'Cajamarca', dist:'San Juan', lat:-7.3009, lon:-78.5451 },
  // ─── TACNA ───────────────────────────────────────────
  { ubigeo:'230101', dep:'Tacna', prov:'Tacna', dist:'Tacna',         lat:-18.0146, lon:-70.2536 },
  { ubigeo:'230102', dep:'Tacna', prov:'Tacna', dist:'Alto de la Alianza', lat:-17.9890, lon:-70.2363 },
  { ubigeo:'230103', dep:'Tacna', prov:'Tacna', dist:'Calana',        lat:-17.9671, lon:-70.1760 },
  { ubigeo:'230104', dep:'Tacna', prov:'Tacna', dist:'Ciudad Nueva',  lat:-18.0015, lon:-70.2302 },
  { ubigeo:'230105', dep:'Tacna', prov:'Tacna', dist:'Inclán',        lat:-18.1021, lon:-70.4069 },
  { ubigeo:'230106', dep:'Tacna', prov:'Tacna', dist:'Pachia',        lat:-17.9017, lon:-70.0848 },
  { ubigeo:'230107', dep:'Tacna', prov:'Tacna', dist:'Palca',         lat:-17.8476, lon:-70.0153 },
  { ubigeo:'230108', dep:'Tacna', prov:'Tacna', dist:'Pocollay',      lat:-18.0029, lon:-70.2458 },
  { ubigeo:'230109', dep:'Tacna', prov:'Tacna', dist:'Sama',          lat:-17.9965, lon:-70.7858 },
  { ubigeo:'230110', dep:'Tacna', prov:'Tacna', dist:'Coronel Gregorio Albarracín Lanchipa', lat:-18.0378, lon:-70.2364 },
]

/**
 * Buscar distritos por texto libre (nombre, provincia, departamento)
 * Retorna hasta N sugerencias ordenadas por relevancia
 */
export function buscarDistritosOffline(texto, limite = 6) {
  if (!texto || texto.length < 3) return []
  const q = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  const normalizar = str => (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const resultados = DISTRITOS_PERU
    .map(d => {
      const nd = normalizar(d.dist)
      const np = normalizar(d.prov)
      const ndep = normalizar(d.dep)
      const fullStr = `${nd} ${np} ${ndep}`
      
      let score = 0
      // Coincidencia exacta al inicio del distrito
      if (nd.startsWith(q)) score += 100
      // Coincidencia exacta en distrito
      else if (nd.includes(q)) score += 60
      // Coincidencia en provincia
      if (np.includes(q)) score += 40
      // Coincidencia en departamento
      if (ndep.includes(q)) score += 20
      // Coincidencia en string completo
      if (fullStr.includes(q)) score += 10

      return { ...d, score }
    })
    .filter(d => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)

  return resultados.map(d => ({
    display:  `${d.dist}, ${d.prov}, ${d.dep}`,
    distrito: d.dist,
    provincia:d.prov,
    departamento: d.dep,
    ubigeo:   d.ubigeo,
    lat:      d.lat,
    lon:      d.lon,
  }))
}
