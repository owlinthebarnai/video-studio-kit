// sci-fluoro palette. The background is pure black; light is only ever ADDED (globalCompositeOperation 'lighter').
export const BG = '#000000';

// Four fluorescence channels. name/nm are what the HUD prints ("CH1 405nm").
export const CH = {
  cyan:    { key: 'cyan',    hex: '#38E8FF', rgb: [56, 232, 255],  name: 'CH1', nm: '405nm' },
  green:   { key: 'green',   hex: '#5CFF8A', rgb: [92, 255, 138],  name: 'CH2', nm: '488nm' },
  yellow:  { key: 'yellow',  hex: '#FFD24A', rgb: [255, 210, 74],  name: 'CH3', nm: '561nm' },
  magenta: { key: 'magenta', hex: '#FF3FD0', rgb: [255, 63, 208],  name: 'CH4', nm: '640nm' },
  // not a channel: bonds, faint structure, saturation. Use sparingly.
  white:   { key: 'white',   hex: '#DCEBFF', rgb: [220, 235, 255], name: 'BF',  nm: '' },
};
export const CHANNELS = ['cyan', 'green', 'yellow', 'magenta'];

// HUD (crisp overlay, drawn source-over after post): cold greys only.
export const HUD = { text: '#D6DEE6', dim: '#7C8894', rule: '#4A545E', bar: '#F2F6FA' };

export const TYPE = {
  mono: 'Consolas, "Lucida Console", monospace',
  sans: 'Bahnschrift, "Segoe UI", Arial, sans-serif',
  min: 24,      // never smaller (12 px at 960x540)
  label: 30,    // tag titles
  caption: 46,  // beat title
  eq: 54,       // equations / big formula
};
export const FONTS = ['24px Consolas', '700 30px Consolas', '300 46px Bahnschrift', '600 46px Bahnschrift'];

// Line weights at 1080p. core = the sharp bright line, halo = its soft glow width.
export const LW = { core: 2.5, halo: 14, ring: 4, hud: 2, bar: 6 };

export const C = (ch) => (typeof ch === 'string' ? CH[ch] : ch);
export const rgba = (rgb, a) => `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${Math.max(0, Math.min(1, a))})`;
// mix toward white (the hot, saturated centre of a fluorescent spot)
export const hot = (rgb, k) => rgb.map((v) => v + (255 - v) * k);
