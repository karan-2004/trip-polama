import { expect, it } from 'vitest';
import { db, TripPolamaDB } from './db';

it('renames the database class without changing its persisted identifier', () => {
  expect(db).toBeInstanceOf(TripPolamaDB);
  expect(db.name).toBe('trailbrain');
});
