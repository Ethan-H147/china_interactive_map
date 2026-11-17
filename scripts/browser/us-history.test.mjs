import scenarios from './atlantic-history.test.mjs';
export default scenarios.filter(s=>s.name.startsWith('US native history'));
