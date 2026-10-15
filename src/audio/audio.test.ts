import { SONGS, freq, parseTrack } from './audio';

describe('music', () => {
  it('A4 is 440 Hz and C4 is middle C', () => {
    expect(freq('A4')).toBeCloseTo(440);
    expect(freq('C4')).toBeCloseTo(261.63, 1);
  });

  for (const [name, song] of Object.entries(SONGS)) {
    it(`${name}: every track has the same length and only valid notes`, () => {
      const lengths = song.tracks.map((t) => parseTrack(t.steps).length);
      expect(new Set(lengths).size, `${name} track lengths ${lengths}`).toBe(1);
      for (const t of song.tracks) {
        for (const tok of t.steps.trim().split(/\s+/)) expect(tok, name).toMatch(/^([A-G]#?\d|-|\.)$/);
        expect(parseTrack(t.steps).notes.length).toBeGreaterThan(4);
      }
    });
  }
});
