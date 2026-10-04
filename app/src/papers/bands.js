/* papers/bands.js — the four grade bands and how many fixed papers each holds. Split from
   engine.js so the landing page can count the papers without downloading the problem banks. */
export const BANDS = {
  g12: { id: 'g12', label: 'Grades 1–2', ages: 'ages 6–8', per: 6, mins: 60 },
  g34: { id: 'g34', label: 'Grades 3–4', ages: 'ages 8–10', per: 8, mins: 75 },
  g56: { id: 'g56', label: 'Grades 5–6', ages: 'ages 10–12', per: 10, mins: 75 },
  g78: { id: 'g78', label: 'Grades 7–8', ages: 'ages 12–14', per: 10, mins: 75 },
};
export const BAND_IDS = Object.keys(BANDS);
export const FIXED = 60;
