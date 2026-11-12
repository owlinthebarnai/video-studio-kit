// reel/cues.js: THE timeline. The page (reel.js) and the score (music/score.mjs) both read it, so every hit in the
// music lands on its frame. 120 BPM: a beat is 0.5 s, a bar 2 s. Put cuts on beats; put chapter changes on bars.
var KCUE = (() => {
  const B = n => +(n * 0.5).toFixed(4);                    // B(n) = time of beat n
  const S = { open: 0, title: 1.5, fire: 3.0 };   // scene starts (s)
  return {
    bpm: 120, fps: 30, dur: 5, B, S,
    CH: [['OPEN', 0, 1.5], ['01 IDEA', 1.5, 3], ['02 FIRE', 3, 5]],
    hits: { dot: 0.3, mark: 1.0, title: 1.55, chips: 2.2, fire: 3.05, sub: 3.6, glitch: 4.5, endDot: 4.75 },
  };
})();
if (typeof module !== 'undefined') module.exports = KCUE;
