import 'server-only';
import {Pool} from 'pg';

const cache=globalThis as typeof globalThis&{occurrenceMapPool?:Pool};

export function getOccurrenceMapPool():Pool{
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is not configured');
  if(!cache.occurrenceMapPool){
    cache.occurrenceMapPool=new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5_000});
  }
  return cache.occurrenceMapPool;
}
