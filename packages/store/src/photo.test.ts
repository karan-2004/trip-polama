import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addPhoto, createTrip, listPhotos } from './repo';

beforeEach(async () => { await db.open(); });

afterEach(async () => {
  await db.photos.clear();
  await db.trips.clear();
  db.close();
});

describe('local photo persistence', () => {
  it('retains image bytes and metadata after closing and reopening the database', async () => {
    const trip = await createTrip({ name: 'Trail', destination: 'Hills',
      startDate: '', endDate: '', currency: 'INR', members: [] });
    const image = new Blob(['image-fixture'], { type: 'image/jpeg' });
    await addPhoto({ tripId: trip.id, filename: 'camera.jpg', image,
      note: 'At camp', placeName: 'Manali', ts: 1 });
    db.close();
    await db.open();
    const [saved] = await listPhotos(trip.id);
    expect(saved?.image?.type).toBe('image/jpeg');
    expect(await saved?.image?.text()).toBe('image-fixture');
    expect(saved?.note).toBe('At camp');
    expect(saved?.placeName).toBe('Manali');
  });

  it('keeps earlier photo notes without an image readable', async () => {
    await db.photos.add({ id: 'legacy', tripId: 'old-trip', filename: 'old.jpg', ts: 1 });
    const [saved] = await listPhotos('old-trip');
    expect(saved?.filename).toBe('old.jpg');
    expect(saved?.image).toBeUndefined();
  });
});
