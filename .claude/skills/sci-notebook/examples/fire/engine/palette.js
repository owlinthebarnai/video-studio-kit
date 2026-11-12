// sci-notebook style constants. Scenes never invent a hex, a line width or a font: they pick from here.

export const PAL = {
  paper: '#F4EDD8',     // cream graph paper
  paperEdge: '#E7DCBF', // radial falloff toward the corners
  grid: '#9DBAD8',      // minor grid (drawn at low alpha)
  gridMajor: '#7FA3CC', // every 5th line
  margin: '#D4544C',    // the red margin rule (paper only, never ink)
  ink: '#1F2A48',       // blue-black ink: every line, letter, arrow
  inkSoft: '#4A5577',   // secondary ink: tick labels, faint construction lines
  pencil: '#5E5A57',    // graphite hatching (drawn at alpha ~0.5)
  hlYellow: '#FFE14D',  // highlighter 1: the key idea / energy / light
  hlOrange: '#FF9F43',  // highlighter 2: heat / hot things
  hlGreen: '#9BE36A',   // highlighter 3: products / "good" result (optional)
  hlPink: '#FF8DBA',    // highlighter 4: warnings (optional, rare)
};

// px at 1080p
export const LW = { main: 5, second: 3.6, fine: 2.6, hatch: 1.7, hl: 36 };

export const FONT = {
  hand: '"Segoe Print", "Ink Free", cursive', // labels, titles, equations (400 / 700)
  note: '"Ink Free", "Segoe Print", cursive', // margin notes, asides (400 only; write() thickens it)
};
// px at 1080p; min 30 keeps everything legible at 960x540
export const TYPE = { title: 56, label: 42, eq: 60, note: 36, small: 32, min: 30 };

export const FONTS = ['700 56px "Segoe Print"', '400 42px "Segoe Print"', '400 36px "Ink Free"'];

// page geometry (1920x1080 logical): red margin at x=250, 36 px grid squares, heavier line every 5
export const PAGE = { margin: 250, grid: 36, major: 5, top: 0 };
