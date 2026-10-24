import {defineConfig} from 'drizzle-kit';
export default defineConfig({schema:'./hosting/db/schema.ts',out:'./hosting/drizzle',dialect:'sqlite'});
