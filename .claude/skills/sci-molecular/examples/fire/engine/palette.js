// palette.js: the only place colours, sizes and type live. Scenes import these; never invent per-scene hexes.

// CPK element colours, tuned for a dark studio (pure CPK black/white clip under tone mapping).
// ball: ball-and-stick radius (A), vdw: space-filling radius (A).
export const ELEMENTS = {
  H:  { color: '#F2F2EE', ball: 0.25, vdw: 1.10, name: 'hydrogen' },
  C:  { color: '#3B3E44', ball: 0.40, vdw: 1.70, name: 'carbon' },
  N:  { color: '#2F5BEA', ball: 0.38, vdw: 1.55, name: 'nitrogen' },
  O:  { color: '#E0322B', ball: 0.37, vdw: 1.52, name: 'oxygen' },
  S:  { color: '#E8C23A', ball: 0.46, vdw: 1.80, name: 'sulfur' },
  P:  { color: '#F08A24', ball: 0.46, vdw: 1.80, name: 'phosphorus' },
  Cl: { color: '#3CC45A', ball: 0.45, vdw: 1.75, name: 'chlorine' },
  Na: { color: '#8E5BD6', ball: 0.50, vdw: 2.27, name: 'sodium' },
  Fe: { color: '#D0772E', ball: 0.48, vdw: 2.00, name: 'iron' },
};

export const PAL = {
  // background: vertical gradient + soft centre lift, all very dark and slightly blue
  bgTop: '#0E1528', bgBottom: '#05070D', bgCenter: '#18223D', fog: '#0B1222',
  // lights
  key: '#FFF3E6', fill: '#7086B8', rim: '#9CC2FF',
  // UI (overlay)
  ink: '#EEF3FB', soft: '#93A3C2', faint: '#5D6B88',
  pill: 'rgba(10,16,30,0.70)', pillEdge: 'rgba(170,200,255,0.30)',
  accent: '#7FD6FF',          // cool diagram accent: leaders, rules, arrows
  // fire family (glow, heat, energy). Warm colours belong to energy only.
  heat: '#FF7A2E', flameCore: '#FFE2A0', flameMid: '#FFA43C', flameEdge: '#E2481C', ember: '#FF5A1F',
  wood: '#8A5A34', woodDark: '#5A3A22', woodLight: '#B9895C',
};

// Overlay type, in px at 1080p (the layer scales by height/1080). Minimum on-screen size: 22 px at 1080 (11 px at 540).
export const TYPE = {
  label:   { family: '"Segoe UI", Arial, sans-serif', weight: 600, size: 30, tracking: 0.04 },
  sub:     { family: '"Segoe UI", Arial, sans-serif', weight: 400, size: 22, tracking: 0.01 },
  kicker:  { family: 'Bahnschrift, "Segoe UI", sans-serif', weight: 600, size: 20, tracking: 0.30 },
  title:   { family: '"Segoe UI", Arial, sans-serif', weight: 300, size: 44, tracking: 0.00 },
  formula: { family: 'Cambria, Georgia, serif', weight: 400, size: 46, tracking: 0.00 },
  atom:    { family: '"Segoe UI", Arial, sans-serif', weight: 700, size: 22, tracking: 0.00 },
  mono:    { family: 'Consolas, monospace', weight: 400, size: 22, tracking: 0.00 },
};

// Line weights, px at 1080p.
export const LINE = { leader: 1.5, dot: 4, ring: 9, rule: 2, arrow: 3 };

// 3D sizes (world unit = 1 angstrom for molecules).
export const BOND = { radius: 0.10, gap: 0.13 /* double/triple bond spacing */ };
