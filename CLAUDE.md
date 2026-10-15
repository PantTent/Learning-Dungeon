# Learning Dungeon - notes for Claude

- The owner wants changes pushed **straight to `main`** (no feature branches or
  pull requests). Every push to main rebuilds the website (GitHub Pages) and the
  Android APK via GitHub Actions.
- Run `npm test` and `npm run build` before pushing. Check UI changes in a
  browser (screenshots) when possible.
- Audience: a 4th grader in Massachusetts. Keep text short, kind and readable,
  and keep every question's answer correct (tests verify math answers and the
  reading bank).
- Pixel art lives in `tools/art/src_*.py`; run `python3 tools/art/gen.py` to
  regenerate `src/art/pixelData.ts`.
