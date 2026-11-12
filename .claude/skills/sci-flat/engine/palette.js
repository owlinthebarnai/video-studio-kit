// sci-flat style constants. Never invent per-scene hexes: pick from PAL.
export const PAL = {
  ink: '#16213E',      // deep navy: every outline, text, axes, bonds
  inkSoft: '#4A5570',  // secondary text, dust, minor marks
  muted: '#8B93A7',    // sub-labels, inactive UI
  rule: '#CFC8B8',     // grid, hairlines, inactive progress
  paper: '#F5F1E8',    // background centre
  paperEdge: '#E7E0D0',// background edge (the ONE gradient)
  tint: '#E8DCC2',     // neutral object fill (wood, panels, containers)
  white: '#FFFDF8',    // highlights, light fills, text on accents
  coral: '#E4572E',    // accent 1: heat / energy / "danger" / the main idea
  amber: '#F3A712',    // accent 2: fuel / light / secondary process
  teal: '#1F9E89',     // accent 3: air / water / cool / product
  // flat light tints of the accents (same hue): backing shapes only
  coralT: '#F7CDBE', amberT: '#FBE2A6', tealT: '#C4E6DE',
};
export const ACCENTS = [PAL.coral, PAL.amber, PAL.teal];

// Line weights in px at 1920x1080 logical. All strokes: round cap, round join.
export const LW = { main: 6, second: 4, leader: 3, hair: 2, grid: 1.25 };

export const TYPE = {
  display: 'Bahnschrift, "Segoe UI", Arial, sans-serif', // labels, numbers, formulas
  sans: '"Segoe UI", Arial, sans-serif',                 // titles, sentences
  mono: 'Consolas, monospace',
  // sizes at 1080p. Nothing below `min` (it must survive 960x540).
  title: 46, label: 34, body: 28, small: 26, min: 24, formula: 58,
};

// Font strings the boot() waits for (system fonts, no network).
export const FONTS = [`600 40px Bahnschrift`, `400 40px Bahnschrift`, `600 40px "Segoe UI"`, `400 40px "Segoe UI"`];
