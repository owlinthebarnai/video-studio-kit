// Silent preview shot: hand-set caption times (no voice). Same shape as voice.py's TIMING.
window.TIMING = {
  voice_end: 5.0,
  lines: [
    { text: "Rub the sticks", key: { sticks: "yellow" }, end: 2.6,
      words: [{ w: "Rub", s: 0.30, e: 0.62 }, { w: "the", s: 0.62, e: 0.80 }, { w: "sticks", s: 0.80, e: 1.40 }] },
    { text: "Fire!", key: { fire: "amber" }, end: 4.8,
      words: [{ w: "Fire!", s: 3.10, e: 3.70 }] }
  ]
};
