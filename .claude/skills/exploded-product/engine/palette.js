// palette.js: the style's colours, type and line weights. Import these; don't invent new hexes per scene.
export const PAL = {
  backdropCenter: '#ECE9E4', // seamless sweep, centre of frame
  backdropEdge: '#D2CDC6',   // sweep at the frame edges (soft radial falloff)
  shadow: '#4F4943',         // contact shadow tint (used at low opacity)
  ink: '#2A2927',            // label text
  inkSoft: '#7B7770',        // sub-captions, header meta
  line: '#3A3936',           // leader lines (drawn at ~0.75 alpha)
  accent: '#B8582E',         // ONE accent: index numbers, seconds-hand tip. Use sparingly.
  steel: '#C8CBCF',          // brushed / polished steel base
  steelDark: '#8E9297',
  gold: '#C9A46A',           // brass / gilt movement parts
  dial: '#1E2A33',           // deep slate matte dial
  dialPrint: '#E9E6DF',      // printing on a dark dial
  rubber: '#2B2B2C',
  leather: '#3A2C25',
  ruby: '#9C1C30',
};

// Type: Windows fonts only, no web fonts. Sizes are px at 1080p (the label layer scales by H/1080).
export const TYPE = {
  label: { family: 'Bahnschrift, "Segoe UI", Arial, sans-serif', weight: 600, size: 15, tracking: 0.22 },
  sub: { family: 'Bahnschrift, "Segoe UI", Arial, sans-serif', weight: 300, size: 12, tracking: 0.12 },
  index: { family: 'Consolas, monospace', weight: 400, size: 12, tracking: 0.05 },
  header: { family: 'Bahnschrift, "Segoe UI", Arial, sans-serif', weight: 600, size: 14, tracking: 0.32 },
};

// Line weights, px at 1080p.
export const LINE = { leader: 1.25, axis: 1, dot: 3.2, ring: 7, tick: 6 };
