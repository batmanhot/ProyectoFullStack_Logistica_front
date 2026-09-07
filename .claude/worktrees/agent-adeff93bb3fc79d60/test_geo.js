const queries = [
  'Av. Universitaria 3400, Los Olivos, Lima, Peru',
  'Av. Universitaria 2650, Los Olivos, Lima, Peru',
  'Av. Universitaria 3400',
  'Av. Universitaria 2650'
].map(encodeURIComponent);
const fetchN = q => fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}&countrycodes=pe`, { headers: { 'User-Agent': 'Test' } }).then(r=>r.json());
Promise.all(queries.map(fetchN))
  .then(res => console.log('Nominatim:', JSON.stringify(res, null, 2))).catch(console.error);
