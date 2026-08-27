'use strict';
const SnakeAudio = (function () {
  let ctx = null;
  let master = null, sfxGain = null, musGain = null;
  let enabled = true, musicOn = false, ytAudioGate = true;
  let musicPlaying = false;
  let musicTimeout = null;
  let musicStep = 0;
  const BPM = 90;
  const STEP = 60 / BPM / 4;
  const NOTES = {
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
    C6: 1046.50,
  };
  const PROG = [
    ['A3', 'C4', 'E4'],
    ['F3', 'A3', 'C4'],
    ['G3', 'B3', 'D4'],
    ['E3', 'G3', 'B3'],
  ];
  const BASS = ['A3', 'F3', 'G3', 'E3'];
  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.connect(ctx.destination);
      sfxGain = ctx.createGain();
      sfxGain.connect(master);
      sfxGain.gain.value = 0.35;
      musGain = ctx.createGain();
      musGain.connect(master);
      musGain.gain.value = 0.12;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  function canPlay() { return enabled && ytAudioGate; }
  function playTone(type, freq, dur, vol, detune) {
    if (!canPlay()) return;
    ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(sfxGain);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + dur + 0.01);
  }
  function tap() {
    playTone('sine', 600 + Math.random() * 200, 0.08, 0.5);
    playTone('sine', 800 + Math.random() * 100, 0.06, 0.3);
  }
  function slide() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(400, t);
    o1.frequency.linearRampToValueAtTime(900, t + 0.15);
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(600, t);
    o2.frequency.linearRampToValueAtTime(1200, t + 0.12);
    g.gain.setValueAtTime(0.3, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o1.connect(g); o2.connect(g); g.connect(sfxGain);
    o1.start(t); o1.stop(t + 0.3);
    o2.start(t); o2.stop(t + 0.28);
  }
  function err() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'square';
    o1.frequency.setValueAtTime(180, t);
    o1.frequency.linearRampToValueAtTime(100, t + 0.15);
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(120, t + 0.05);
    o2.frequency.linearRampToValueAtTime(60, t + 0.2);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o1.connect(g); o2.connect(g); g.connect(sfxGain);
    o1.start(t); o1.stop(t + 0.2);
    o2.start(t + 0.05); o2.stop(t + 0.25);
  }
  function pop() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(800, t);
    o.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + 0.12);
  }
  function crack() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    const bufSize = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 3);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 2000;
    filt.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(filt); filt.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + 0.16);
  }
  function unlock() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    [0, 80, 160].forEach((d, i) => {
      playTone('sine', [523, 659, 784][i], 0.2, 0.25);
    });
  }
  function win() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i < 3 ? 'triangle' : 'sine';
      o.frequency.value = freq;
      const start = t + i * 0.12;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.3, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      o.connect(g); g.connect(sfxGain);
      o.start(start); o.stop(start + 0.42);
    });
  }
  function star() {
    playTone('sine', 880, 0.15, 0.3);
    playTone('sine', 1100, 0.2, 0.25, 5);
  }
  function click() {
    playTone('sine', 1000, 0.04, 0.2);
  }
  function playNote(name, type, vol, dur, t) {
    if (!musicOn || !ytAudioGate) return;
    ensure();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = NOTES[name];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(musGain);
    o.start(t); o.stop(t + dur + 0.01);
  }
  function scheduleMusic() {
    if (!musicPlaying || !musicOn || !ytAudioGate) return;
    ensure();
    const step = musicStep % 16;
    const chordIdx = Math.floor(step / 4);
    const beat = step % 4;
    const t = ctx.currentTime + 0.05;
    const chord = PROG[chordIdx];
    if (beat === 0) {
      playNote(BASS[chordIdx], 'sine', 0.25, STEP * 3.5, t);
    }
    if (beat === 2) {
      playNote(BASS[chordIdx], 'sine', 0.15, STEP * 1.5, t);
    }
    if (beat === 0 || beat === 2) {
      chord.forEach((n, i) => {
        playNote(n, 'triangle', 0.08, STEP * 1.8, t + 0.01);
      });
    }
    if (step % 4 === 0 && Math.random() < 0.5) {
      playNote(chord[2], 'sine', 0.06, STEP * 1.5, t + STEP);
    }
    if (step % 2 === 0) {
      playNote(chord[Math.floor(Math.random() * chord.length)], 'sine', 0.04, STEP * 0.8, t + STEP * 0.5);
    }
    musicStep++;
    musicTimeout = setTimeout(scheduleMusic, STEP * 1000);
  }
  function startMusic() {
    if (musicPlaying) return;
    if (!musicOn || !ytAudioGate) return;
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    musicPlaying = true;
    musicStep = 0;
    scheduleMusic();
  }
  function stopMusic() {
    musicPlaying = false;
    if (musicTimeout) clearTimeout(musicTimeout);
    musicTimeout = null;
  }
  function suspend() {
    if (ctx && ctx.state === 'running') ctx.suspend();
    stopMusic();
  }
  function resume() {
    ensure();
    if (musicOn && ytAudioGate) startMusic();
  }
  function setEnabled(v) { enabled = v; applyVol(); }
  function setMusic(v) { musicOn = v; applyVol(); }
  function setYtGate(v) {
    ytAudioGate = v;
    if (v && ctx && ctx.state === 'suspended') ctx.resume();
    applyVol();
  }
  function applyVol() {
    ensure();
    sfxGain.gain.value = enabled && ytAudioGate ? 0.35 : 0;
    musGain.gain.value = musicOn && ytAudioGate ? 0.12 : 0;
    if (musicOn && ytAudioGate && !musicPlaying) startMusic();
    if ((!musicOn || !ytAudioGate) && musicPlaying) stopMusic();
  }
  function tick() {
    if (!canPlay()) return;
    ensure();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.08);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + 0.12);
  }
  function init() { ensure(); }
  return {
    init, ensure, suspend, resume,
    tap, slide, err, win, star, click, pop, crack, unlock, tick,
    startMusic, stopMusic,
    setEnabled, setMusic, setYtGate,
    get enabled() { return enabled; },
    get musicOn() { return musicOn; },
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SnakeAudio;
