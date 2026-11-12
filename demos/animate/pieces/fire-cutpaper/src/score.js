  const T = TIMELINE, cu = T.cues;
  to = 'm';
  pad(0.0, 2.3, ['D3', 'A3'], 0.03, { type: 'triangle', cut: 700, att: 0.05, rel: 0.2 });
  pad(2.25, 5.0, ['D3', 'A3', 'D4', 'Fs4'], 0.05, { cut: 1400, att: 0.1, rel: 0.4, send: 0.4 });
  to = 's';
  for (let i = 0; i < 8; i++) noiseHit(0.2 + i * 0.25, 0.08, 'bandpass', 2200, 2, 0.05, 0);
  noiseHit(cu.spark, 0.5, 'lowpass', 900, 1, 0.12, 0); sub(cu.spark, 0.5);
