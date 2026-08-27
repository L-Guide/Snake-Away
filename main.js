'use strict';
const Game = (function () {
  const S = {
    state: 'loading', canvas: null, ctx: null,
    screenW: 0, screenH: 0,
    level: null, occ: null,
    mistakes: 0, hearts: 3, moves: 0,
    undos: 3, undoStack: [],
    hintSnake: null, hintTimer: 0,
    boardX: 0, boardY: 0, cellSize: 0,
    exitAnims: [], particles: [],
    shakeT: 0, shakeA: 0, redFlash: 0,
    time: 0, dt: 0, lastTime: 0,
    currentLevel: 1, unlocked: 1, stars: {},
    cache: {}, paused: false,
    ytMode: false, firstFrameSent: false,
    winTime: 0, starAnims: [],
    blockedHighlight: null, blockedTimer: 0,
    bgBokeh: [],
    tutorial: null, tutorialTime: 0,
    handX: 0, handY: 0, handTargetX: 0, handTargetY: 0,
    handTapT: 0, handVisible: false,
    floatTexts: [],
    collectibleAnims: [],
    world: null, totalScore: 0, levelScore: 0,
    tutSeen: {},
  };
  const PAD = 18;
  const TUTORIAL_MECHS = [
    { level: 1, key: 'basic', title: '👉 Tap to Free!', msg: 'Tap the glowing snake to slide it off the board. Clear every snake to win the level!' },
    { level: 3, key: 'collect', title: '🎁 Treasure Boxes', msg: 'Some levels hide a treasure box! Clear a snake right next to it to break it open and collect the prize inside.' },
    { level: 5, key: 'ice', title: '🧊 Icy Snakes', msg: 'Frosted snakes need 2 taps: first tap cracks the ice, second tap sends it off (only if the path is clear).' },
    { level: 10, key: 'stone', title: '🪨 Stone Blocks', msg: 'Grey stones never move. A snake can only exit if no stone or snake blocks its path.' },
    { level: 15, key: 'dbl', title: '↔️ Double Snakes', msg: 'Snakes with arrows on both ends can exit from either side — whichever direction is clear.' },
    { level: 20, key: 'gold', title: '✨ Golden Snakes', msg: 'Golden snakes shimmer for style — same rules apply, just extra satisfying to clear!' },
    { level: 25, key: 'wrap', title: '🔁 Wrap Around', msg: 'On this board, the edges loop! A snake can exit one side and reappear on the other.' },
    { level: 30, key: 'lshape', title: '📐 Bent Snakes', msg: 'Some snakes bend in an L-shape. They still only exit in the direction their head arrow points.' },
    { level: 35, key: 'chain', title: '🔒 Locked Snakes', msg: 'A locked snake (chain icon) can\'t be freed until the snake holding its key is cleared first.' },
  ];
  function init() {
    S.canvas = document.getElementById('gc');
    S.ctx = S.canvas.getContext('2d');
    S.ytMode = (typeof ytgame !== 'undefined') && !!ytgame && !!(ytgame.IN_PLAYABLES_ENV);
    loadProgress();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    if (!S.ytMode) {
      document.addEventListener('visibilitychange', function () {
        if (S.state !== 'play') return;
        if (document.hidden) pauseGame();
        else if (S.paused) resumeGame();
      });
    }
    if (S.ytMode) {
      try {
        ytgame.system.onPause(function () { platformPause(); });
        ytgame.system.onResume(function () { platformResume(); });
        ytgame.system.onAudioEnabledChange(function (en) { SnakeAudio.setYtGate(en); });
        SnakeAudio.setYtGate(ytgame.system.isAudioEnabled());
      } catch (e) { /* ignore */ }
    }
    for (var i = 0; i < 12; i++) {
      S.bgBokeh.push({
        x: Math.random(), y: Math.random(),
        r: 30 + Math.random() * 60,
        speed: 0.01 + Math.random() * 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }
    S.lastTime = performance.now();
    S.state = 'home';
    show('home');
    updateSoundUI();
    requestAnimationFrame(loop);
    if (S.ytMode && !S.firstFrameSent) {
      requestAnimationFrame(function () {
        try { ytgame.game.firstFrameReady(); } catch (e) {}
        S.firstFrameSent = true;
        setTimeout(function () {
          try { ytgame.game.gameReady(); } catch (e) {}
        }, 200);
      });
    }
  }
  function sdkScore(s) {
    try { if (S.ytMode && typeof ytgame !== 'undefined' && ytgame.engagement) ytgame.engagement.sendScore({ value: Math.floor(s) }); } catch (e) {}
  }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    S.canvas.width = w * dpr;
    S.canvas.height = h * dpr;
    S.canvas.style.width = w + 'px';
    S.canvas.style.height = h + 'px';
    S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    S.screenW = w;
    S.screenH = h;
    if (S.state === 'play' && S.level) computeBoard();
  }
  function computeBoard() {
    var topReserve = Math.max(70, S.screenH * 0.09);
    var bottomReserve = Math.max(84, S.screenH * 0.11);
    var availW = S.screenW - PAD * 2;
    var availH = S.screenH - topReserve - bottomReserve;
    var cs = Math.floor(Math.min(availW / S.level.W, availH / S.level.H));
    S.cellSize = Math.max(14, Math.min(64, cs));
    var bw = S.cellSize * S.level.W;
    var bh = S.cellSize * S.level.H;
    S.boardX = Math.floor((S.screenW - bw) / 2);
    S.boardY = Math.floor(topReserve + Math.max(0, (availH - bh) / 2));
  }
  function getLevel(L) {
    if (!S.cache[L]) S.cache[L] = SnakeCore.generateLevel(L);
    return S.cache[L];
  }
  function startLevel(L) {
    S.currentLevel = L;
    S.floatTexts = [];
    S.particles = [];
    S.exitAnims = [];
    S.collectFlyAnims = [];
    var tmpl = getLevel(L);
    S.level = {
      W: tmpl.W, H: tmpl.H, wrap: !!tmpl.wrap, par: tmpl.parMoves,
      stones: tmpl.stones ? tmpl.stones.slice() : [],
      collectibles: tmpl.collectibles ? tmpl.collectibles.map(function (c) { return { x: c.x, y: c.y, type: c.type, alive: true }; }) : [],
      snakes: tmpl.snakes.map(function (s) {
        return {
          id: s.id, x: s.x, y: s.y,
          dir: { dx: s.dir.dx, dy: s.dir.dy },
          dx: s.dir.dx, dy: s.dir.dy,
          len: s.len, cells: s.cells.map(function (c) { return { x: c.x, y: c.y }; }),
          colorIdx: s.colorIdx, placeIdx: s.placeIdx, alive: true,
          hp: s.hp || 1, dbl: !!s.dbl, golden: !!s.golden,
          lshape: !!s.lshape, lockKey: s.lockKey || 0,
        };
      }),
    };
    S.occ = SnakeCore.initOcc(S.level);
    S.mistakes = 0;
    S.hearts = 3;
    S.moves = 0;
    S.levelScore = 0;
    S.collected = 0;
    S.collectedTypes = {};
    S.undos = 3;
    S.undoStack = [];
    S.hintSnake = null;
    S.hintTimer = 0;
    S.exitAnims = [];
    S.particles = [];
    S.shakeT = 0;
    S.redFlash = 0;
    S.blockedHighlight = null;
    S.blockedTimer = 0;
    S.floatTexts = [];
    S.collectibleAnims = [];
    S.collectFlyAnims = [];
    S.world = SnakeCore.getWorld(L);
    computeBoard();
    S.state = 'play';
    show('play');
    SnakeAudio.init();
    SnakeAudio.startMusic();
    checkTutorial();
    if (L < 500) setTimeout(function () { getLevel(L + 1); }, 100);
  }
  function checkTutorial() {
    var tut = null;
    for (var i = TUTORIAL_MECHS.length - 1; i >= 0; i--) {
      if (S.currentLevel === TUTORIAL_MECHS[i].level) { tut = TUTORIAL_MECHS[i]; break; }
    }
    if (tut) {
      var seen = S.tutSeen || {};
      if (!seen[tut.key]) {
        S.tutorial = tut; S.tutorialTime = 0;
        seen[tut.key] = true;
        S.tutSeen = seen;
        saveProgress();
        initTutorialHand();
      }
    }
  }
  function initTutorialHand() {
    var free = SnakeCore.findFree(S.level, S.occ);
    if (free.length > 0) {
      var s = free[0], head = s.cells[0];
      S.handTargetX = S.boardX + (head.x + 0.5) * S.cellSize;
      S.handTargetY = S.boardY + (head.y + 0.5) * S.cellSize;
      S.handX = S.handTargetX + 60;
      S.handY = S.handTargetY + 60;
      S.handTapT = 0;
      S.handVisible = true;
    }
  }
  function dismissTutorial() { S.tutorial = null; S.handVisible = false; }
  function addFloatText(text, x, y, col) {
    S.floatTexts.push({ text: text, x: x, y: y, col: col, t: 0 });
    if (S.floatTexts.length > 8) S.floatTexts.shift();
  }
  function pauseGame() {
    S.paused = true;
    document.body.classList.add('cd-paused');
    saveProgress();
    SnakeAudio.suspend();
  }
  function resumeGame() {
    S.paused = false;
    document.body.classList.remove('cd-paused');
    SnakeAudio.resume();
  }
  function platformPause() {
    if (S.paused) return;
    S.paused = true;
    document.body.classList.add('cd-paused');
    saveProgress();
    SnakeAudio.suspend();
  }
  function platformResume() {
    if (!S.paused) return;
    S.paused = false;
    document.body.classList.remove('cd-paused');
    if (_adShowing) return;
    if (S.state === 'play') {
      show('play');
      SnakeAudio.resume();
    }
  }
  function show(id) {
    var screens = ['home', 'select', 'play', 'win', 'lose', 'howto', 'complete'];
    screens.forEach(function (s) {
      var el = document.getElementById('scr-' + s);
      if (el) el.style.display = (s === id) ? 'flex' : 'none';
    });
    if (id === 'home') updateHomeUI();
    if (id === 'select') buildSelectGrid();
    if (id === 'win') updateWinUI();
    if (id === 'lose') updateLoseUI();
    if (id === 'play') updatePlayUI();
  }
  function updateHomeUI() {
    var el = document.getElementById('home-level');
    if (el) el.textContent = 'Level ' + S.currentLevel;
    var totalStars = 0;
    for (var k in S.stars) { if (S.stars.hasOwnProperty(k)) totalStars += S.stars[k]; }
    el = document.getElementById('home-stars');
    if (el) el.textContent = totalStars + ' / 1500';
    el = document.getElementById('home-unlocked');
    if (el) el.textContent = S.unlocked + ' / 500';
    el = document.getElementById('home-progress-fill');
    if (el) el.style.width = Math.min(100, (S.unlocked / 500) * 100) + '%';
    el = document.getElementById('home-progress-label');
    if (el) el.textContent = 'Level ' + S.currentLevel + ' / 500';
  }
  function updatePlayUI() {
    var el;
    el = document.getElementById('hud-level');
    if (el) {
      var txt = 'Level ' + S.currentLevel;
      if (S.world) txt = S.world.icon + ' ' + txt;
      el.textContent = txt;
    }
    el = document.getElementById('hud-hearts');
    if (el) {
      var h = '';
      for (var i = 0; i < 3; i++) {
        h += '<span class="heart' + (i < S.hearts ? '' : ' empty') + '">&#10084;</span>';
      }
      el.innerHTML = h;
    }
    el = document.getElementById('hud-undos');
    if (el) el.textContent = S.undos;
    el = document.getElementById('undo-btn');
    if (el) {
      var canUndo = S.undos > 0 && S.undoStack.length > 0;
      el.classList.toggle('btn-disabled', !canUndo);
    }
    var totalCol = S.level && S.level.collectibles ? S.level.collectibles.length : 0;
    var collectEl = document.getElementById('hud-collect');
    if (totalCol > 0 && collectEl) {
      collectEl.style.display = '';
      var textEl = document.getElementById('hud-collect-text');
      if (textEl) {
        var typeCounts = {};
        var typeOrder = [];
        for (var i = 0; i < S.level.collectibles.length; i++) {
          var c = S.level.collectibles[i];
          var name = c.type.name;
          if (!typeCounts[name]) { typeCounts[name] = { emoji: c.type.emoji, total: 0, collected: 0 }; typeOrder.push(name); }
          typeCounts[name].total++;
        }
        if (S.collectedTypes) {
          for (var tn in S.collectedTypes) {
            if (typeCounts[tn]) typeCounts[tn].collected = S.collectedTypes[tn];
          }
        }
        var parts = [];
        for (var i = 0; i < typeOrder.length; i++) {
          var tc = typeCounts[typeOrder[i]];
          parts.push(tc.emoji + ' ' + tc.collected + '/' + tc.total);
        }
        textEl.textContent = parts.join('  ');
      }
      collectEl.classList.toggle('done', S.collected >= totalCol);
    } else if (collectEl) {
      collectEl.style.display = 'none';
    }
  }
  function updateWinUI() {
    var sc = SnakeCore.calcStars(S.mistakes);
    var prev = S.stars[S.currentLevel] || 0;
    if (sc > prev) S.stars[S.currentLevel] = sc;
    if (S.currentLevel >= S.unlocked) S.unlocked = Math.min(500, S.currentLevel + 1);
    saveProgress();
    sdkScore(S.totalScore);
    var el;
    el = document.getElementById('win-level');
    if (el) {
      var txt = 'Level ' + S.currentLevel + ' Complete!';
      if (S.world) txt = S.world.icon + ' ' + txt;
      el.textContent = txt;
    }
    var sub = document.getElementById('win-subtitle');
    if (sub) {
      var msgs = ['Amazing!', 'Awesome!', 'Great Job!', 'Brilliant!', 'Superb!', 'Fantastic!', 'Well Done!'];
      if (sc >= 3) msgs = ['Perfect!', 'Flawless!', 'Legendary!', 'Masterpiece!'];
      else if (sc >= 2) msgs = ['Amazing!', 'Awesome!', 'Brilliant!', 'Superb!'];
      sub.textContent = msgs[S.currentLevel % msgs.length];
    }
    el = document.getElementById('win-score');
    if (el) {
      if (S.levelScore > 0) {
        el.textContent = '+' + S.levelScore;
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    }
    el = document.getElementById('win-collect-summary');
    if (el && S.level && S.level.collectibles && S.level.collectibles.length > 0) {
      var typeCounts = {};
      for (var i = 0; i < S.level.collectibles.length; i++) {
        var c = S.level.collectibles[i];
        if (!typeCounts[c.type.name]) typeCounts[c.type.name] = { emoji: c.type.emoji, total: 0, got: 0 };
        typeCounts[c.type.name].total++;
      }
      for (var tn in S.collectedTypes) {
        if (typeCounts[tn]) typeCounts[tn].got = S.collectedTypes[tn];
      }
      var h = '';
      for (var tn in typeCounts) {
        var tc = typeCounts[tn];
        h += '<div class="wc-item"><span class="wc-emoji">' + tc.emoji + '</span><span class="wc-count">' + tc.got + '/' + tc.total + '</span></div>';
      }
      el.innerHTML = h;
      el.style.display = '';
    } else if (el) {
      el.style.display = 'none';
    }
    el = document.getElementById('win-stars');
    if (el) {
      var s = '';
      S.starAnims = [];
      for (var i = 0; i < 3; i++) {
        S.starAnims.push({ filled: i < sc, t: 0 });
        s += '<span class="star ' + (i < sc ? 'filled' : 'empty') + '" id="star-' + i + '">&#9733;</span>';
      }
      el.innerHTML = s;
      setTimeout(function () {
        for (var j = 0; j < sc; j++) {
          (function (idx) {
            setTimeout(function () {
              var st = document.getElementById('star-' + idx);
              if (st) {
                st.classList.add('win-pop');
                SnakeAudio.star();
                winConfetti();
              }
            }, idx * 400);
          })(j);
        }
      }, 300);
    }
  }
  function updateLoseUI() {
    var el = document.getElementById('lose-level');
    if (el) el.textContent = 'Level ' + S.currentLevel;
  }
  function buildSelectGrid() {
    var grid = document.getElementById('select-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 1; i <= 500; i++) {
      var d = document.createElement('div');
      d.className = 'sel-cell' + (i <= S.unlocked ? '' : ' locked') + (i === S.currentLevel ? ' current' : '');
      var w = SnakeCore.getWorld(i);
      d.style.borderColor = i <= S.unlocked ? w.accent + '44' : '';
      var num = document.createElement('div');
      num.className = 'sel-num';
      num.textContent = i;
      d.appendChild(num);
      if (S.stars[i]) {
        var st = document.createElement('div');
        st.className = 'sel-stars';
        var sv = '';
        for (var j = 0; j < 3; j++) sv += j < S.stars[i] ? '&#9733;' : '&#9734;';
        st.innerHTML = sv;
        d.appendChild(st);
      }
      if (i <= S.unlocked) {
        d.addEventListener('click', (function (lv) {
          return function () { startLevel(lv); };
        })(i));
      }
      grid.appendChild(d);
    }
    var cur = grid.children[S.currentLevel - 1];
    if (cur) setTimeout(function () { cur.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
  }
  function onPointer(e) {
    if (S.tutorial) { dismissTutorial(); e.preventDefault(); return; }
    if (e.target && (e.target.closest('.btn') || e.target.closest('.hud-btn') || e.target.closest('.sel-cell'))) return;
    if (S.state !== 'play' || S.paused || _adShowing) return;
    e.preventDefault();
    SnakeAudio.ensure();
    var px = e.clientX - S.boardX;
    var py = e.clientY - S.boardY;
    var cx = Math.floor(px / S.cellSize);
    var cy = Math.floor(py / S.cellSize);
    if (cx < 0 || cx >= S.level.W || cy < 0 || cy >= S.level.H) return;
    var id = S.occ[cy][cx];
    if (id === -1 || id === -2) return;
    var snake = S.level.snakes.find(function (s) { return s.id === id && s.alive; });
    if (!snake) return;
    tryRemove(snake);
  }
  function onKey(e) {
    if (e.key === 'g' || e.key === 'G') {
      if (S.state === 'home') {
        var savedUnlocked = S.unlocked;
        showCompleteScreen();
        S.unlocked = savedUnlocked;
        saveProgress();
        e.preventDefault();
      }
    }
  }
  function tryRemove(snake) {
    S.hintSnake = null;
    S.hintTimer = 0;
    var fx = S.boardX + (snake.x + 0.5) * S.cellSize;
    var fy = S.boardY + snake.y * S.cellSize;
    if (snake.lockKey) {
      for (var k = 0; k < S.level.snakes.length; k++) {
        if (S.level.snakes[k].id === snake.lockKey && S.level.snakes[k].alive) {
          S.mistakes++;
          S.hearts--;
          S.shakeT = 0.25;
          S.shakeA = 5;
          S.redFlash = 0.3;
          SnakeAudio.err();
          addFloatText('LOCKED!', fx, fy, '#FFD54F');
          updatePlayUI();
          if (S.hearts <= 0) {
            S.state = 'lost';
            S.winTime = 0;
            SnakeAudio.err();
            setTimeout(function () { if (S.state === 'lost') show('lose'); }, 600);
          }
          return;
        }
      }
    }
    pushUndo();
    if (snake.hp > 1) {
      snake.hp--;
      S.moves++;
      SnakeAudio.crack();
      addFloatText('CRACK!', fx, fy, '#9FD8FF');
      spawnParticles(snake);
      updatePlayUI();
      return;
    }
    var free = SnakeCore.canExitNow(S.level, snake, S.occ);
    if (free) {
      snake.alive = false;
      for (var i = 0; i < snake.cells.length; i++) {
        S.occ[snake.cells[i].y][snake.cells[i].x] = -1;
      }
      S.moves++;
      S.exitAnims.push({
        snake: snake, t: 0, dur: 0.45,
      });
      SnakeAudio.slide();
      spawnParticles(snake);
      if (S.level.collectibles) {
        for (var ci = 0; ci < S.level.collectibles.length; ci++) {
          var cc = S.level.collectibles[ci];
          if (!cc.alive) continue;
          for (var si = 0; si < snake.cells.length; si++) {
            var sc = snake.cells[si];
            var dx = Math.abs(cc.x - sc.x), dy = Math.abs(cc.y - sc.y);
            if (dx <= 1 && dy <= 1) {
              cc.alive = false;
              if (S.occ[cc.y][cc.x] === -3 || S.occ[cc.y][cc.x] === -1) {
                S.occ[cc.y][cc.x] = -1;
              }
              S.levelScore += cc.type.points;
              S.collected++;
              if (!S.collectedTypes[cc.type.name]) S.collectedTypes[cc.type.name] = 0;
              S.collectedTypes[cc.type.name]++;
              SnakeAudio.star();
              var fx = S.boardX + (cc.x + 0.5) * S.cellSize;
              var fy = S.boardY + cc.y * S.cellSize;
              spawnBoxBreak(fx, fy + S.cellSize / 2, cc.type.color);
              S.collectFlyAnims.push({ emoji: cc.type.emoji, x: fx, y: fy, t: 0, dur: 0.6, color: cc.type.color });
              var collectEl = document.getElementById('hud-collect');
              if (collectEl) { collectEl.classList.remove('bump'); void collectEl.offsetWidth; collectEl.classList.add('bump'); }
              updatePlayUI();
              break;
            }
          }
        }
      }
      for (var u = 0; u < S.level.snakes.length; u++) {
        if (S.level.snakes[u].lockKey === snake.id && S.level.snakes[u].alive) {
          SnakeAudio.unlock();
          addFloatText('UNLOCKED!', S.boardX + (S.level.snakes[u].x + 0.5) * S.cellSize, S.boardY + S.level.snakes[u].y * S.cellSize, '#FFD54F');
          break;
        }
      }
      updatePlayUI();
      if (SnakeCore.isCleared(S.level)) {
        S.totalScore += S.levelScore;
        S.state = 'won';
        S.winTime = 0;
        SnakeAudio.win();
        saveProgress();
      }
    } else {
      S.mistakes++;
      S.hearts--;
      S.shakeT = 0.4;
      S.shakeA = 8;
      S.redFlash = 0.3;
      SnakeAudio.err();
      addFloatText('BLOCKED!', fx, fy, '#FF6B6B');
      var blocker = SnakeCore.getBlocker(S.level, snake, S.occ);
      if (blocker) {
        S.blockedHighlight = blocker;
        S.blockedTimer = 1.2;
      }
      if (S.level.wrap) {
        var wrapHit = false;
        var d2 = snake.dir;
        var tcx = snake.x + d2.dx, tcy = snake.y + d2.dy, steps2 = 0;
        while (steps2 < S.level.W + S.level.H) {
          if (tcx < 0 || tcx >= S.level.W || tcy < 0 || tcy >= S.level.H) {
            wrapHit = true; break;
          }
          var v2 = S.occ[tcy][tcx];
          if (v2 === -2) break;
          if (v2 !== -1 && v2 !== snake.id) break;
          tcx += d2.dx; tcy += d2.dy; steps2++;
        }
        if (wrapHit) {
          addFloatText('WRAP!', fx, fy + 28, '#64B5F6');
        }
      }
      updatePlayUI();
      if (S.hearts <= 0) {
        S.state = 'lost';
        setTimeout(function () { if (S.state === 'lost') show('lose'); }, 600);
      }
    }
  }
  function pushUndo() {
    var snapshot = {
      mistakes: S.mistakes,
      hearts: S.hearts,
      moves: S.moves,
      alive: S.level.snakes.map(function (s) { return s.id + ':' + (s.alive ? 1 : 0); }).join(','),
      hp: S.level.snakes.map(function (s) { return s.id + ':' + s.hp; }).join(','),
    };
    S.undoStack.push(snapshot);
    if (S.undoStack.length > 30) S.undoStack.shift();
  }
  function doUndo() {
    if (S.undos <= 0 || S.undoStack.length === 0) return;
    var snap = S.undoStack.pop();
    S.undos--;
    S.mistakes = snap.mistakes;
    S.hearts = snap.hearts;
    S.moves = snap.moves;
    var aliveMap = {};
    snap.alive.split(',').forEach(function (p) {
      var parts = p.split(':');
      aliveMap[parts[0]] = parts[1] === '1';
    });
    var hpMap = {};
    if (snap.hp) {
      snap.hp.split(',').forEach(function (p) {
        var parts = p.split(':');
        hpMap[parts[0]] = parseInt(parts[1], 10);
      });
    }
    S.level.snakes.forEach(function (s) {
      var wasAlive = aliveMap[s.id];
      if (s.alive && !wasAlive) {
        s.alive = false;
        for (var i = 0; i < s.cells.length; i++) {
          S.occ[s.cells[i].y][s.cells[i].x] = -1;
        }
      } else if (!s.alive && wasAlive) {
        s.alive = true;
        for (var i = 0; i < s.cells.length; i++) {
          S.occ[s.cells[i].y][s.cells[i].x] = s.id;
        }
      }
      if (hpMap[s.id] !== undefined) s.hp = hpMap[s.id];
    });
    S.state = 'play';
    show('play');
    updatePlayUI();
  }
  function doHint() {
    if (S.hintTimer > 0) return;
    var free = SnakeCore.findFree(S.level, S.occ);
    if (free.length === 0) {
      addFloatText('No safe move yet!', S.screenW / 2, S.screenH * 0.4, '#FFD54F');
      SnakeAudio.click();
      return;
    }
    S.hintSnake = free[free.length - 1];
    S.hintTimer = 3;
    SnakeAudio.click();
  }
  function spawnParticles(snake) {
    var col = SnakeCore.COLORS[snake.colorIdx % SnakeCore.COLORS.length];
    for (var i = 0; i < 8; i++) {
      S.particles.push({
        x: S.boardX + (snake.x + 0.5) * S.cellSize,
        y: S.boardY + (snake.y + 0.5) * S.cellSize,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120 - 40,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        col: col,
        r: 2 + Math.random() * 3,
      });
    }
  }
  function spawnBoxBreak(cx, cy, color) {
    var woodCols = ['#C68642', '#A0522D', '#8B5A2B', color];
    for (var i = 0; i < 14; i++) {
      var ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
      var spd = 90 + Math.random() * 140;
      S.particles.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        life: 0.5 + Math.random() * 0.35,
        maxLife: 0.85,
        col: woodCols[i % woodCols.length],
        r: 2 + Math.random() * 3.5,
        square: true,
      });
    }
  }
  function spawnConfetti() {
    var cols = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    for (var i = 0; i < 60; i++) {
      S.particles.push({
        x: Math.random() * S.screenW,
        y: -20 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 80,
        vy: 100 + Math.random() * 150,
        life: 2 + Math.random() * 2,
        maxLife: 4,
        col: cols[Math.floor(Math.random() * cols.length)],
        r: 3 + Math.random() * 4,
        confetti: true,
      });
    }
  }
  var winConfettiParticles = [];
  var winConfettiAnim = 0;
  function winConfetti() {
    var canvas = document.getElementById('win-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var cols = ['#FFD700', '#FF6B6B', '#4ECDC4', '#FF69B4', '#96CEB4', '#FFEAA7', '#DDA0DD', '#76FF03', '#E040FB'];
    var shapes = ['rect', 'circle', 'tri'];
    for (var i = 0; i < 30; i++) {
      winConfettiParticles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 500,
        vy: -200 - Math.random() * 300,
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4,
        col: cols[Math.floor(Math.random() * cols.length)],
        r: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
    if (!winConfettiAnim) {
      winConfettiAnim = 1;
      var lastT = performance.now();
      function wLoop(ts) {
        var dt = Math.min(0.05, (ts - lastT) / 1000);
        lastT = ts;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var alive = false;
        for (var i = winConfettiParticles.length - 1; i >= 0; i--) {
          var p = winConfettiParticles[i];
          p.x += p.vx * dt;
          p.vy += 400 * dt;
          p.y += p.vy * dt;
          p.rot += p.rotSpeed * dt;
          p.life -= dt;
          if (p.life <= 0) { winConfettiParticles.splice(i, 1); continue; }
          alive = true;
          var alpha = Math.min(1, p.life / 0.5);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.col;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          if (p.shape === 'rect') {
            ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
          } else if (p.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, p.r * 0.6, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -p.r);
            ctx.lineTo(p.r, p.r * 0.7);
            ctx.lineTo(-p.r, p.r * 0.7);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
        if (alive) requestAnimationFrame(wLoop);
        else { winConfettiAnim = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); }
      }
      requestAnimationFrame(wLoop);
    }
  }
  function loop(ts) {
    var dt = Math.min(0.05, (ts - S.lastTime) / 1000);
    S.lastTime = ts;
    S.time += dt;
    S.dt = dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  function update(dt) {
    if (S.state === 'play' && !S.paused) {
      S.tutorialTime += dt;
      if (S.handVisible && S.tutorial) {
        var dx = S.handTargetX - S.handX;
        var dy = S.handTargetY - S.handY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          S.handX += dx * Math.min(1, dt * 4);
          S.handY += dy * Math.min(1, dt * 4);
        } else {
          S.handTapT += dt * 5;
        }
      }
      if (S.hintTimer > 0) {
        S.hintTimer -= dt;
        if (S.hintTimer <= 0) S.hintSnake = null;
      }
      if (S.shakeT > 0) S.shakeT -= dt;
      if (S.redFlash > 0) S.redFlash -= dt;
      if (S.blockedTimer > 0) {
        S.blockedTimer -= dt;
        if (S.blockedTimer <= 0) S.blockedHighlight = null;
      }
      for (var i = S.exitAnims.length - 1; i >= 0; i--) {
        S.exitAnims[i].t += dt;
        if (S.exitAnims[i].t >= S.exitAnims[i].dur) S.exitAnims.splice(i, 1);
      }
      for (var i = S.floatTexts.length - 1; i >= 0; i--) {
        var ft = S.floatTexts[i];
        ft.t += dt;
        ft.y -= 34 * dt;
        if (ft.t > 0.9) S.floatTexts.splice(i, 1);
      }
      for (var i = S.collectibleAnims.length - 1; i >= 0; i--) {
        S.collectibleAnims[i].t += dt;
        if (S.collectibleAnims[i].t >= S.collectibleAnims[i].dur) S.collectibleAnims.splice(i, 1);
      }
      for (var i = S.collectFlyAnims.length - 1; i >= 0; i--) {
        S.collectFlyAnims[i].t += dt;
        if (S.collectFlyAnims[i].t >= S.collectFlyAnims[i].dur) S.collectFlyAnims.splice(i, 1);
      }
    }
    if (S.state === 'won') {
      S.winTime += dt;
      if (S.winTime > 0.3 && S.winTime < 0.35) spawnConfetti();
      if (S.winTime > 0.8 && S.winTime < 0.85) {
        if (S.currentLevel >= 500) {
          showCompleteScreen();
        } else {
          show('win');
        }
      }
    }
    for (var i = S.particles.length - 1; i >= 0; i--) {
      var p = S.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.confetti) { p.vx *= 0.98; }
      else { p.vy += 180 * dt; }
      p.life -= dt;
      if (p.life <= 0) S.particles.splice(i, 1);
    }
    for (var i = 0; i < S.bgBokeh.length; i++) {
      var b = S.bgBokeh[i];
      b.y += b.speed * dt;
      if (b.y > 1.2) { b.y = -0.2; b.x = Math.random(); }
    }
  }
  function render() {
    var c = S.ctx;
    var w = S.screenW, h = S.screenH;
    c.clearRect(0, 0, w, h);
    drawBg(c, w, h);
    if (S.state === 'play' || S.state === 'won' || S.state === 'lost') {
      drawBoard(c);
    }
    drawParticles(c);
    drawFloatTexts(c);
    drawOverlays(c);
    if (S.tutorial) drawTutorial(c);
  }
  function drawFloatTexts(c) {
    for (var i = 0; i < S.floatTexts.length; i++) {
      var ft = S.floatTexts[i];
      var alpha = Math.max(0, 1 - ft.t / 0.9);
      var scale = ft.t < 0.12 ? 0.6 + (ft.t / 0.12) * 0.4 : 1;
      c.save();
      c.globalAlpha = alpha;
      c.translate(ft.x, ft.y);
      c.scale(scale, scale);
      c.font = 'bold ' + Math.round(Math.max(16, S.screenW * 0.042)) + 'px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(10,15,30,0.8)';
      c.strokeText(ft.text, 0, 0);
      c.fillStyle = ft.col;
      c.fillText(ft.text, 0, 0);
      c.restore();
    }
  }
  function drawBg(c, w, h) {
    var w1 = S.world || { bg1: '#0a1628', bg2: '#142040', accent: '#4ECDC4' };
    var grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, w1.bg1);
    grd.addColorStop(0.5, w1.bg2);
    grd.addColorStop(1, w1.bg1);
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
    for (var i = 0; i < S.bgBokeh.length; i++) {
      var b = S.bgBokeh[i];
      c.globalAlpha = 0.06;
      c.fillStyle = w1.accent;
      c.beginPath();
      c.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  function drawBoard(c) {
    if (!S.level) return;
    var shakeX = 0, shakeY = 0;
    if (S.shakeT > 0) {
      shakeX = Math.sin(S.shakeT * 40) * S.shakeA * (S.shakeT / 0.4);
    }
    var bx = S.boardX + shakeX;
    var by = S.boardY + shakeY;
    var bw = S.cellSize * S.level.W;
    var bh = S.cellSize * S.level.H;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.4)';
    c.shadowBlur = 20;
    c.shadowOffsetX = 0;
    c.shadowOffsetY = 6;
    c.fillStyle = 'rgba(12,20,40,0.85)';
    roundRect(c, bx - 10, by - 10, bw + 20, bh + 20, 14);
    c.fill();
    c.shadowColor = 'transparent';
    c.fillStyle = 'rgba(20,35,60,0.6)';
    roundRect(c, bx - 4, by - 4, bw + 8, bh + 8, 8);
    c.fill();
    for (var gy = 0; gy < S.level.H; gy++) {
      for (var gx = 0; gx < S.level.W; gx++) {
        var sx = bx + gx * S.cellSize;
        var sy = by + gy * S.cellSize;
        c.fillStyle = (gx + gy) % 2 === 0 ? 'rgba(30,50,80,0.4)' : 'rgba(25,40,65,0.4)';
        c.fillRect(sx + 1, sy + 1, S.cellSize - 2, S.cellSize - 2);
      }
    }
    if (S.level.stones) {
      for (var i = 0; i < S.level.stones.length; i++) {
        var st = S.level.stones[i];
        var stoneBlocked = S.blockedHighlight && S.blockedHighlight.type === 'wall' && S.blockedHighlight.x === st.x && S.blockedHighlight.y === st.y && S.blockedTimer > 0;
        drawStone(c, bx + st.x * S.cellSize, by + st.y * S.cellSize, S.cellSize, st.x * 31 + st.y * 17, stoneBlocked);
      }
    }
    if (S.level.wrap) {
      var pulse = Math.sin(S.time * 2) * 0.15 + 0.25;
      c.strokeStyle = 'rgba(100,200,255,' + pulse + ')';
      c.lineWidth = 3;
      roundRect(c, bx - 2, by - 2, bw + 4, bh + 4, 12);
      c.stroke();
      var arrowPulse = Math.sin(S.time * 3) * 0.3 + 0.5;
      c.fillStyle = 'rgba(100,200,255,' + arrowPulse + ')';
      c.font = 'bold ' + Math.round(S.cellSize * 0.35) + 'px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (var gi = 0; gi < S.level.W; gi++) {
        c.fillText('\u25B2', bx + gi * S.cellSize + S.cellSize / 2, by - 8);
        c.fillText('\u25BC', bx + gi * S.cellSize + S.cellSize / 2, by + bh + 8);
      }
      for (var gj = 0; gj < S.level.H; gj++) {
        c.fillText('\u25C0', bx - 8, by + gj * S.cellSize + S.cellSize / 2);
        c.fillText('\u25B6', bx + bw + 8, by + gj * S.cellSize + S.cellSize / 2);
      }
    }
    if (S.redFlash > 0) {
      c.globalAlpha = S.redFlash * 0.3;
      c.fillStyle = '#ff0000';
      roundRect(c, bx - 10, by - 10, bw + 20, bh + 20, 14);
      c.fill();
      c.globalAlpha = 1;
    }
    for (var i = 0; i < S.level.snakes.length; i++) {
      var sn = S.level.snakes[i];
      if (!sn.alive) continue;
      drawSnake(c, sn, bx, by);
    }
    drawCollectibles(c);
    drawChains(c, bx, by);
    if (S.blockedHighlight && S.blockedTimer > 0 && S.level.wrap) {
      var bh2 = S.blockedHighlight;
      if (bh2.type === 'snake' && bh2.snake) {
        var lastSnake = null;
        for (var i = S.level.snakes.length - 1; i >= 0; i--) {
          if (S.level.snakes[i].alive && S.level.snakes[i].id !== bh2.snake.id) {
            var tmpS = S.level.snakes[i];
            if (SnakeCore.getBlocker(S.level, tmpS, S.occ) && SnakeCore.getBlocker(S.level, tmpS, S.occ).snake && SnakeCore.getBlocker(S.level, tmpS, S.occ).snake.id === bh2.snake.id) {
              lastSnake = tmpS; break;
            }
          }
        }
        if (!lastSnake) {
          for (var i = 0; i < S.level.snakes.length; i++) {
            if (S.level.snakes[i].alive && !SnakeCore.canExitNow(S.level, S.level.snakes[i], S.occ)) {
              var blk = SnakeCore.getBlocker(S.level, S.level.snakes[i], S.occ);
              if (blk && blk.type === 'snake' && blk.snake.id === bh2.snake.id) {
                lastSnake = S.level.snakes[i]; break;
              }
            }
          }
        }
        if (lastSnake) {
          var sx1 = bx + (lastSnake.x + 0.5) * S.cellSize;
          var sy1 = by + (lastSnake.y + 0.5) * S.cellSize;
          var sx2 = bx + (bh2.snake.cells[0].x + 0.5) * S.cellSize;
          var sy2 = by + (bh2.snake.cells[0].y + 0.5) * S.cellSize;
          var alpha = Math.min(1, S.blockedTimer * 2);
          c.save();
          c.globalAlpha = alpha * 0.6;
          c.strokeStyle = '#FF6B6B';
          c.lineWidth = 2.5;
          c.setLineDash([6, 4]);
          c.beginPath();
          c.moveTo(sx1, sy1);
          c.lineTo(sx2, sy2);
          c.stroke();
          c.setLineDash([]);
          c.restore();
        }
      }
    }
    for (var i = 0; i < S.exitAnims.length; i++) {
      drawExitAnim(c, S.exitAnims[i], bx, by);
    }
    c.restore();
  }
  function drawSnake(c, sn, bx, by) {
    var cs = S.cellSize;
    var col = SnakeCore.COLORS[sn.colorIdx % SnakeCore.COLORS.length];
    var isHint = S.hintSnake && S.hintSnake.id === sn.id;
    var isBlocked = S.blockedHighlight && S.blockedHighlight.type === 'snake' && S.blockedHighlight.snake && S.blockedHighlight.snake.id === sn.id && S.blockedTimer > 0;
    var locker = sn.lockKey ? SnakeCore.lockingSnake(S.level, sn) : null;
    var isLocked = !!locker;
    var drawCol = isBlocked ? '#cc0000' : col;
    var pts = sn.cells.map(function (cell) {
      return { x: bx + cell.x * cs + cs / 2, y: by + cell.y * cs + cs / 2 };
    });
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.4)';
    c.shadowBlur = 6;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 4;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (pts.length > 1) {
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
      c.lineWidth = cs * 0.6;
      c.strokeStyle = darken(drawCol, 30);
      c.stroke();
      c.lineWidth = cs * 0.48;
      c.strokeStyle = drawCol;
      c.stroke();
      c.lineWidth = cs * 0.28;
      c.strokeStyle = lighten(drawCol, 25);
      c.stroke();
    }
    c.shadowColor = 'transparent';
    for (var p = 0; p < sn.cells.length; p++) {
      var cell = sn.cells[p];
      var sx = bx + cell.x * cs;
      var sy = by + cell.y * cs;
      c.save();
      var grad = c.createLinearGradient(sx, sy, sx + cs, sy + cs);
      if (isBlocked) {
        grad.addColorStop(0, '#ff6666');
        grad.addColorStop(1, '#aa0000');
      } else {
        grad.addColorStop(0, lighten(drawCol, 20));
        grad.addColorStop(1, darken(drawCol, 15));
      }
      c.fillStyle = grad;
      var pad = 3;
      roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.18);
      c.fill();
      var belly = c.createLinearGradient(sx + cs * 0.25, sy, sx + cs * 0.75, sy + cs);
      belly.addColorStop(0, 'rgba(255,255,255,0.12)');
      belly.addColorStop(1, 'rgba(0,0,0,0.08)');
      c.fillStyle = belly;
      roundRect(c, sx + pad + 2, sy + pad + 2, cs - pad * 2 - 4, cs - pad * 2 - 4, cs * 0.12);
      c.fill();
      if (p % 2 === 0) {
        c.fillStyle = 'rgba(0,0,0,0.06)';
        c.beginPath();
        c.arc(sx + cs / 2, sy + cs / 2, cs * 0.22, 0, Math.PI * 2);
        c.fill();
      }
      if (isLocked) {
        c.fillStyle = 'rgba(10,15,25,0.45)';
        roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.18);
        c.fill();
      }
      c.restore();
    }
    var headCell = sn.cells[0];
    var hsx = bx + headCell.x * cs;
    var hsy = by + headCell.y * cs;
    var faceDx, faceDy;
    if (sn.cells.length <= 1) {
      faceDx = sn.dir.dx;
      faceDy = sn.dir.dy;
    } else {
      faceDx = sn.cells[0].x - sn.cells[1].x;
      faceDy = sn.cells[0].y - sn.cells[1].y;
    }
    drawSnakeHead(c, hsx, hsy, cs, faceDx, faceDy, drawCol, isBlocked);
    var isKeySnake = false;
    if (S.level) {
      for (var ki = 0; ki < S.level.snakes.length; ki++) {
        var ks = S.level.snakes[ki];
        if (ks.alive && ks.lockKey === sn.id) { isKeySnake = true; break; }
      }
    }
    if (isKeySnake) {
      var kpulse = 0.7 + Math.sin(S.time * 3.5 + 1) * 0.3;
      c.save();
      c.globalAlpha = kpulse;
      var kx = hsx + cs * 0.78, ky = hsy + cs * 0.22;
      c.fillStyle = 'rgba(15,15,20,0.85)';
      c.beginPath();
      c.arc(kx, ky, cs * 0.22, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#FFD54F';
      c.lineWidth = Math.max(1, cs * 0.02);
      c.stroke();
      c.fillStyle = '#FFD54F';
      c.font = Math.round(cs * 0.24) + 'px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('\uD83D\uDDDD', kx, ky + cs * 0.01);
      c.restore();
    }
    
    if (isHint) {
      var pulse = Math.sin(S.time * 6) * 0.3 + 0.7;
      c.save();
      c.globalAlpha = pulse;
      c.strokeStyle = '#FFD700';
      c.lineWidth = 3;
      c.shadowColor = 'rgba(255,215,0,0.5)';
      c.shadowBlur = 8;
      for (var p = 0; p < sn.cells.length; p++) {
        var cell = sn.cells[p];
        var sx = bx + cell.x * cs;
        var sy = by + cell.y * cs;
        roundRect(c, sx, sy, cs, cs, cs * 0.22);
        c.stroke();
      }
      c.globalAlpha = 1;
      c.restore();
    }
    if (sn.hp > 1) {
      c.save();
      var shimmer = 0.55 + Math.sin(S.time * 3 + sn.id) * 0.12;
      for (var p = 0; p < sn.cells.length; p++) {
        var cell = sn.cells[p];
        var sx = bx + cell.x * cs;
        var sy = by + cell.y * cs;
        var ig = c.createLinearGradient(sx, sy, sx + cs, sy + cs);
        ig.addColorStop(0, 'rgba(228,246,255,' + Math.min(0.9, shimmer + 0.2) + ')');
        ig.addColorStop(0.5, 'rgba(150,212,250,' + shimmer * 0.7 + ')');
        ig.addColorStop(1, 'rgba(200,236,255,' + Math.min(0.9, shimmer + 0.15) + ')');
        c.fillStyle = ig;
        roundRect(c, sx + 1, sy + 1, cs - 2, cs - 2, cs * 0.18);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 1.5;
        roundRect(c, sx + 1, sy + 1, cs - 2, cs - 2, cs * 0.18);
        c.stroke();
      }
      c.restore();
    }
    if (sn.golden) {
      c.save();
      for (var p = 0; p < sn.cells.length; p++) {
        var cell = sn.cells[p];
        var sx = bx + cell.x * cs;
        var sy = by + cell.y * cs;
        var ph = ((S.time * 0.7 + p * 0.37 + sn.id * 0.11) % 1);
        var gx = sx - cs * 0.25 + ph * cs * 1.5;
        var lg = c.createLinearGradient(gx - cs * 0.35, 0, gx + cs * 0.35, 0);
        lg.addColorStop(0, 'rgba(255,215,0,0)');
        lg.addColorStop(0.5, 'rgba(255,245,190,0.6)');
        lg.addColorStop(1, 'rgba(255,215,0,0)');
        c.fillStyle = lg;
        roundRect(c, sx + 2, sy + 2, cs - 4, cs - 4, cs * 0.18);
        c.fill();
      }
      c.restore();
    }
    if (sn.lockKey) {
      var locked = false;
      for (var j = 0; j < S.level.snakes.length; j++) {
        if (S.level.snakes[j].id === sn.lockKey && S.level.snakes[j].alive) { locked = true; break; }
      }
      if (locked) {
        c.save();
        var bob = Math.sin(S.time * 3) * 2;
        var lcx = bx + headCell.x * cs + cs / 2;
        var lcy = by + headCell.y * cs + cs / 2 + bob;
        var lr = cs * 0.22;
        c.strokeStyle = '#b9c2cf';
        c.lineWidth = Math.max(2, cs * 0.09);
        c.lineCap = 'round';
        c.beginPath();
        c.arc(lcx, lcy - lr * 0.55, lr * 0.72, Math.PI, 0);
        c.stroke();
        c.fillStyle = '#f0b429';
        roundRect(c, lcx - lr, lcy - lr * 0.55, lr * 2, lr * 1.7, lr * 0.35);
        c.fill();
        c.strokeStyle = '#8a6410';
        c.lineWidth = Math.max(1, cs * 0.03);
        roundRect(c, lcx - lr, lcy - lr * 0.55, lr * 2, lr * 1.7, lr * 0.35);
        c.stroke();
        c.fillStyle = '#5d430b';
        c.beginPath();
        c.arc(lcx, lcy + lr * 0.15, lr * 0.28, 0, Math.PI * 2);
        c.fill();
        c.fillRect(lcx - lr * 0.12, lcy + lr * 0.15, lr * 0.24, lr * 0.55);
        c.restore();
      }
    }
    c.restore(); // Perfectly matched single save/restore pair
  }
  function drawChains(c, bx, by) {
    var cs = S.cellSize;
    for (var i = 0; i < S.level.snakes.length; i++) {
      var s = S.level.snakes[i];
      if (!s.alive || !s.lockKey) continue;
      var key = null;
      for (var j = 0; j < S.level.snakes.length; j++) {
        if (S.level.snakes[j].id === s.lockKey && S.level.snakes[j].alive) { key = S.level.snakes[j]; break; }
      }
      if (!key) continue;
      var x1 = bx + (s.cells[0].x + 0.5) * cs, y1 = by + (s.cells[0].y + 0.5) * cs;
      var x2 = bx + (key.cells[0].x + 0.5) * cs, y2 = by + (key.cells[0].y + 0.5) * cs;
      var mx = (x1 + x2) / 2 + (y2 - y1) * 0.15, my = (y1 + y2) / 2 - (x2 - x1) * 0.15;
      var pulse = 0.7 + Math.sin(S.time * 3) * 0.3;
      c.save();
      c.globalAlpha = pulse * 0.3;
      c.strokeStyle = '#FFD54F';
      c.lineWidth = Math.max(8, cs * 0.28);
      c.setLineDash([]);
      c.lineCap = 'round';
      c.shadowColor = 'rgba(255,213,79,0.9)';
      c.shadowBlur = 18;
      c.beginPath();
      c.moveTo(x1, y1);
      c.quadraticCurveTo(mx, my, x2, y2);
      c.stroke();
      c.restore();
      c.save();
      c.globalAlpha = pulse;
      c.strokeStyle = '#FFE082';
      c.lineWidth = Math.max(3, cs * 0.1);
      c.setLineDash([cs * 0.2, cs * 0.12]);
      c.lineDashOffset = -S.time * 30;
      c.lineCap = 'round';
      c.shadowColor = 'rgba(255,224,130,0.8)';
      c.shadowBlur = 12;
      c.beginPath();
      c.moveTo(x1, y1);
      c.quadraticCurveTo(mx, my, x2, y2);
      c.stroke();
      c.restore();
    }
  }
  function drawSnakeHead(c, sx, sy, cs, dx, dy, col, isBlocked) {
    var cx = sx + cs / 2;
    var cy = sy + cs / 2;
    var r = cs * 0.32;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    var hg = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
    hg.addColorStop(0, lighten(col, 40));
    hg.addColorStop(1, col);
    c.fillStyle = hg;
    c.fill();
    var eyeOff = r * 0.35;
    var eyeR = r * 0.2;
    var px = dx * r * 0.2;
    var py = dy * r * 0.2;
    var e1x = cx - dy * eyeOff + px;
    var e1y = cy + dx * eyeOff + py;
    var e2x = cx + dy * eyeOff + px;
    var e2y = cy - dx * eyeOff + py;
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(e1x, e1y, eyeR, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(e2x, e2y, eyeR, 0, Math.PI * 2); c.fill();
    var pr = eyeR * 0.5;
    c.fillStyle = isBlocked ? '#ff0000' : '#111';
    c.beginPath(); c.arc(e1x + dx * pr * 0.5, e1y + dy * pr * 0.5, pr, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(e2x + dx * pr * 0.5, e2y + dy * pr * 0.5, pr, 0, Math.PI * 2); c.fill();
    var tongueLen = r * 0.5;
    var flick = Math.sin(S.time * 8) * 0.4 + 0.6;
    c.strokeStyle = '#e33';
    c.lineWidth = Math.max(1, cs * 0.04);
    c.lineCap = 'round';
    var tx = cx + dx * (r + tongueLen * flick * 0.5);
    var ty = cy + dy * (r + tongueLen * flick * 0.5);
    c.beginPath();
    c.moveTo(cx + dx * r * 0.9, cy + dy * r * 0.9);
    c.lineTo(tx, ty);
    c.stroke();
    var forkLen = tongueLen * 0.3 * flick;
    var fx = tx + dx * forkLen;
    var fy = ty + dy * forkLen;
    c.beginPath();
    c.moveTo(tx, ty);
    c.lineTo(fx - dy * forkLen * 0.5, fy + dx * forkLen * 0.5);
    c.moveTo(tx, ty);
    c.lineTo(fx + dy * forkLen * 0.5, fy - dx * forkLen * 0.5);
    c.stroke();
  }
  function drawTri(c, x, y, dx, dy, r, fill, stroke) {
    var px = -dy, py = dx;
    c.beginPath();
    c.moveTo(x + dx * r * 1.25, y + dy * r * 1.25);
    c.lineTo(x - dx * r * 0.55 + px * r, y - dy * r * 0.55 + py * r);
    c.lineTo(x - dx * r * 0.55 - px * r, y - dy * r * 0.55 - py * r);
    c.closePath();
    if (stroke) {
      c.lineWidth = Math.max(1, r * 0.4);
      c.strokeStyle = stroke;
      c.stroke();
    }
    c.fillStyle = fill;
    c.fill();
  }
  function drawExitAnim(c, anim, bx, by) {
    var sn = anim.snake;
    var cs = S.cellSize;
    var p = Math.min(1, anim.t / anim.dur);
    var ep = easeInQuad(p);
    var col = SnakeCore.COLORS[sn.colorIdx % SnakeCore.COLORS.length];
    c.globalAlpha = 1 - p * 0.8;
    for (var i = 0; i < sn.cells.length; i++) {
      var cell = sn.cells[i];
      var ox = sn.dx * ep * cs * 3;
      var oy = sn.dy * ep * cs * 3;
      var sx = bx + cell.x * cs + ox;
      var sy = by + cell.y * cs + oy;
      c.fillStyle = col;
      var pad = 3;
      roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  function drawParticles(c) {
    for (var i = 0; i < S.particles.length; i++) {
      var p = S.particles[i];
      var alpha = Math.max(0, p.life / p.maxLife);
      c.globalAlpha = p.confetti ? alpha * 0.8 : alpha;
      c.fillStyle = p.col;
      c.beginPath();
      if (p.confetti || p.square) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.life * 5 + i);
        c.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
        c.restore();
      } else {
        c.arc(p.x, p.y, p.r * alpha, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }
  function drawCollectibles(c) {
    if (!S.level || !S.level.collectibles) return;
    var bx = S.boardX, by = S.boardY, cs = S.cellSize;
    for (var i = 0; i < S.level.collectibles.length; i++) {
      var col = S.level.collectibles[i];
      if (!col.alive) continue;
      var sx = bx + col.x * cs;
      var sy = by + col.y * cs;
      var bob = Math.sin(S.time * 2.5 + i * 1.7) * 2;
      var pulse = 0.9 + Math.sin(S.time * 3 + i * 2.1) * 0.1;
      var pad = cs * 0.1;
      c.save();
      // crate shadow
      c.fillStyle = 'rgba(0,0,0,0.25)';
      roundRect(c, sx + pad + 2, sy + pad + 3, cs - pad * 2, cs - pad * 2, cs * 0.14);
      c.fill();
      // crate body (wood gradient)
      var wg = c.createLinearGradient(sx, sy, sx + cs, sy + cs);
      wg.addColorStop(0, '#C68642');
      wg.addColorStop(0.5, '#A0651F');
      wg.addColorStop(1, '#7A4A18');
      c.fillStyle = wg;
      roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.14);
      c.fill();
      c.strokeStyle = 'rgba(50,28,10,0.7)';
      c.lineWidth = Math.max(1, cs * 0.02);
      roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.14);
      c.stroke();
      // plank lines
      c.strokeStyle = 'rgba(50,28,10,0.35)';
      c.lineWidth = Math.max(1, cs * 0.015);
      c.beginPath();
      c.moveTo(sx + pad, sy + cs * 0.4); c.lineTo(sx + cs - pad, sy + cs * 0.4);
      c.moveTo(sx + pad, sy + cs * 0.65); c.lineTo(sx + cs - pad, sy + cs * 0.65);
      c.stroke();
      // item glowing inside, peeking through
      c.save();
      c.globalAlpha = pulse * 0.95;
      c.font = Math.round(cs * 0.42) + 'px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = col.type.color;
      c.shadowBlur = 8;
      c.fillText(col.type.emoji, sx + cs / 2, sy + cs / 2 + bob);
      c.restore();
      c.restore();
    }
    for (var i = S.collectibleAnims.length - 1; i >= 0; i--) {
      var a = S.collectibleAnims[i];
      a.t += S.dt;
      var prog = a.t / a.dur;
      if (prog >= 1) { S.collectibleAnims.splice(i, 1); continue; }
      c.save();
      c.globalAlpha = 1 - prog;
      c.font = 'bold ' + Math.round(cs * 0.5) + 'px Arial';
      c.textAlign = 'center';
      c.fillStyle = a.col;
      c.fillText(a.points, a.x, a.y - prog * 40);
      c.restore();
    }
    for (var i = S.collectFlyAnims.length - 1; i >= 0; i--) {
      var f = S.collectFlyAnims[i];
      var prog = Math.min(1, f.t / f.dur);
      var eased = 1 - Math.pow(1 - prog, 3);
      var targetX = S.screenW / 2;
      var targetY = 20;
      var curX = f.x + (targetX - f.x) * eased;
      var curY = f.y + (targetY - f.y) * eased - eased * 80;
      var scale = 1 - eased * 0.6;
      c.save();
      c.globalAlpha = 1 - prog * 0.5;
      c.font = Math.round(cs * 0.5 * scale) + 'px Arial';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.shadowColor = f.color;
      c.shadowBlur = 12;
      c.fillText(f.emoji, curX, curY);
      c.restore();
    }
  }
  function drawOverlays(c) {
    var w = S.screenW, h = S.screenH;
    if (S.redFlash > 0) {
      c.globalAlpha = S.redFlash * 0.15;
      c.fillStyle = '#ff0000';
      c.fillRect(0, 0, w, h);
      c.globalAlpha = 1;
    }
  }
  function drawStone(c, sx, sy, cs, seed, blocked) {
    var pad = 3;
    c.save();
    c.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(c, sx + pad + 2, sy + pad + 3, cs - pad * 2, cs - pad * 2, cs * 0.16);
    c.fill();
    var sg = c.createLinearGradient(sx, sy, sx + cs, sy + cs);
    if (blocked) {
      sg.addColorStop(0, '#e05555');
      sg.addColorStop(0.5, '#b83333');
      sg.addColorStop(1, '#8a2222');
    } else {
      sg.addColorStop(0, '#6a6a74');
      sg.addColorStop(0.5, '#54545e');
      sg.addColorStop(1, '#41414a');
    }
    c.fillStyle = sg;
    roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.16);
    c.fill();
    if (blocked) {
      var pulse = 0.5 + Math.sin(S.time * 10) * 0.5;
      c.strokeStyle = 'rgba(255,120,120,' + (0.6 + pulse * 0.4) + ')';
      c.lineWidth = 2.5;
      c.shadowColor = 'rgba(255,80,80,0.8)';
      c.shadowBlur = 10;
    } else {
      c.strokeStyle = 'rgba(20,20,26,0.6)';
      c.lineWidth = 1;
    }
    roundRect(c, sx + pad, sy + pad, cs - pad * 2, cs - pad * 2, cs * 0.16);
    c.stroke();
    c.restore();
  }
  function drawTutorial(c) {
    var w = S.screenW, h = S.screenH;
    c.save();
    var fontSize = Math.max(15, Math.min(w * 0.055, 26));
    var msgFontSize = Math.max(12, Math.min(w * 0.038, 17));
    var boxW = Math.min(w - 40, 340);
    var maxTextW = boxW - 40;
    c.font = msgFontSize + 'px Arial';
    var words = S.tutorial.msg.split(' ');
    var line = '', lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line + (line ? ' ' : '') + words[i];
      if (c.measureText(test).width > maxTextW && line) { lines.push(line); line = words[i]; }
      else line = test;
    }
    if (line) lines.push(line);
    var lineH = msgFontSize * 1.5;
    var boxH = 46 + lines.length * lineH + 42;
    var boxX = (w - boxW) / 2;
    var boxY = Math.max(40, Math.floor((S.boardY - boxH) / 2));
    c.fillStyle = 'rgba(0,0,0,0.68)';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,35,60,0.97)';
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 20;
    roundRect(c, boxX, boxY, boxW, boxH, 16);
    c.fill();
    c.shadowColor = 'transparent';
    c.strokeStyle = 'rgba(100,180,255,0.4)';
    c.lineWidth = 2;
    roundRect(c, boxX, boxY, boxW, boxH, 16);
    c.stroke();
    c.fillStyle = '#fff';
    c.font = 'bold ' + fontSize + 'px Arial';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(S.tutorial.title, w / 2, boxY + 30);
    c.font = msgFontSize + 'px Arial';
    c.fillStyle = '#a0b8d0';
    for (var i = 0; i < lines.length; i++) {
      c.fillText(lines[i], w / 2, boxY + 30 + fontSize * 0.9 + i * lineH + lineH * 0.5);
    }
    c.fillStyle = 'rgba(100,180,255,0.7)';
    c.font = 'bold ' + Math.max(11, msgFontSize * 0.85) + 'px Arial';
    c.fillText('Tap anywhere to continue', w / 2, boxY + boxH - 18);
    c.restore();
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }
  function lighten(hex, pct) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + pct);
    g = Math.min(255, g + pct);
    b = Math.min(255, b + pct);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function darken(hex, pct) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - pct);
    g = Math.max(0, g - pct);
    b = Math.max(0, b - pct);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function easeInQuad(t) { return t * t; }
  function loadProgress() {
    if (S.ytMode && typeof ytgame !== 'undefined' && ytgame.game && ytgame.game.loadData) {
      ytgame.game.loadData().then(function (raw) {
        if (!raw) return;
        var d = JSON.parse(raw);
        S.unlocked = d.unlocked || 1;
        S.stars = d.stars || {};
        S.currentLevel = d.currentLevel || 1;
        S.totalScore = d.totalScore || 0;
        S.tutSeen = d.tutSeen || {};
      }).catch(function () { });
    } else {
      try {
        var raw = localStorage.getItem('snake-away-save');
        if (!raw) return;
        var d = JSON.parse(raw);
        S.unlocked = d.unlocked || 1;
        S.stars = d.stars || {};
        S.currentLevel = d.currentLevel || 1;
        S.totalScore = d.totalScore || 0;
        S.tutSeen = d.tutSeen || {};
      } catch (e) { /* ignore */ }
    }
  }
  function saveProgress() {
    var d = {
      unlocked: S.unlocked,
      stars: S.stars,
      currentLevel: S.currentLevel,
      totalScore: S.totalScore,
      tutSeen: S.tutSeen || {},
    };
    if (S.ytMode && typeof ytgame !== 'undefined' && ytgame.game && ytgame.game.saveData) {
      ytgame.game.saveData(JSON.stringify(d)).catch(function () { });
    } else {
      try { localStorage.setItem('snake-away-save', JSON.stringify(d)); } catch (e) { /* ignore */ }
    }
  }
  function btnHome() {
    var btn = document.querySelector('#scr-lose .btn-secondary, #scr-win .btn-secondary');
    if (btn) btn.disabled = true;
    sdkAd('interstitial').then(function () {
      if (btn) btn.disabled = false;
      S.state = 'home';
      S.floatTexts = [];
      S.particles = [];
      S.exitAnims = [];
      S.collectFlyAnims = [];
      SnakeAudio.stopMusic();
      show('home');
      updateSoundUI();
      saveProgress();
    });
    setTimeout(function () { if (btn) btn.disabled = false; }, 5000);
  }
  function btnLevels() { show('select'); }
  function btnRestart() {
    S.paused = false;
    document.body.classList.remove('cd-paused');
    startLevel(S.currentLevel);
  }
  function btnNext() {
    var btn = document.querySelector('#scr-win .btn-primary');
    if (btn) btn.disabled = true;
    sdkAd('interstitial').then(function () {
      if (btn) btn.disabled = false;
      winConfettiParticles = [];
      var c = document.getElementById('win-canvas');
      if (c) { var ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); }
      if (S.currentLevel < 500) startLevel(S.currentLevel + 1);
      else { showCompleteScreen(); }
    });
    setTimeout(function () { if (btn) btn.disabled = false; }, 5000);
  }
  function btnReplay() {
    var btn = document.querySelector('#scr-win .btn-secondary');
    if (btn) btn.disabled = true;
    sdkAd('interstitial').then(function () {
      if (btn) btn.disabled = false;
      winConfettiParticles = [];
      var c = document.getElementById('win-canvas');
      if (c) { var ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); }
      startLevel(S.currentLevel);
    });
    setTimeout(function () { if (btn) btn.disabled = false; }, 5000);
  }
  function btnRetry() {
    var btn = document.querySelector('#scr-lose .btn-primary');
    if (btn) btn.disabled = true;
    sdkAd('interstitial').then(function () {
      if (btn) btn.disabled = false;
      startLevel(S.currentLevel);
    });
    setTimeout(function () { if (btn) btn.disabled = false; }, 5000);
  }
  function btnHowto() {
    show('howto');
  }
  function btnHowtoBack() {
    show('home');
  }
  function btnUndo() { doUndo(); }
  function btnHint() { doHint(); }

  var _adShowing = false;
  function sdkAd(type, rewardType) {
    if (typeof ytgame === 'undefined' || !ytgame || !ytgame.ads) {
      return type === 'rewarded' ? Promise.resolve(false) : Promise.resolve();
    }
    _adShowing = true;
    if (type === 'interstitial') {
      return ytgame.ads.requestInterstitialAd().catch(function () {}).finally(function () { _adShowing = false; });
    }
    var rid = (rewardType || 'generic') + '-reward-' + Date.now();
    return ytgame.ads.requestRewardedAd(rid).catch(function () { return false; }).finally(function () { _adShowing = false; });
  }

  function btnRewatchAd() {
    if (_adShowing) return;
    var btn = document.getElementById('btn-revive');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    sdkAd('revive').then(function (rewarded) {
      if (rewarded) {
        S.hearts = 3;
        S.state = 'play';
        S.paused = false;
        document.body.classList.remove('cd-paused');
        show('play');
        updatePlayUI();
        SnakeAudio.ensure();
      }
      if (btn) {
        btn.disabled = false;
        btn.textContent = rewarded ? '\uD83D\uDCF8 +3 Hearts!' : '\uD83D\uDEAB Not Available';
        setTimeout(function () { btn.textContent = '\uD83D\uDCF8 Free Revive'; }, 2000);
      }
    });
  }
  function btnRewatchHint() {
    if (_adShowing) return;
    var btn = document.getElementById('btn-free-hint');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading...'; }
    sdkAd('hint').then(function (rewarded) {
      if (rewarded) {
        if (S.state === 'play' && !S.paused) doHint();
      }
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = rewarded ? '<span>&#127916;</span> Hint Ready!' : '<span>&#127916;</span> Not Available';
        setTimeout(function () { btn.innerHTML = '<span>&#127916;</span> Free Hint'; }, 2000);
      }
    });
  }

  var completeConfetti = [];
  var completeAnimId = 0;
  function showCompleteScreen() {
    S.unlocked = 500;
    saveProgress();
    var totalStars = 0;
    for (var k in S.stars) totalStars += S.stars[k];
    var el;
    el = document.getElementById('complete-stars');
    if (el) el.textContent = totalStars + ' / ' + (500 * 3);
    show('complete');
    startConfetti();
  }
  function startConfetti() {
    var canvas = document.getElementById('complete-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = window.innerWidth;
    var H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    completeConfetti = [];
    var colors = ['#FFD700','#FFA500','#FF6B6B','#4ECDC4','#96CEB4','#FF69B4','#87CEEB','#E040FB','#76FF03'];
    for (var i = 0; i < 80; i++) {
      completeConfetti.push({
        x: Math.random() * W,
        y: Math.random() * H * 0.3 - H * 0.3,
        w: 6 + Math.random() * 8,
        h: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 12,
        gravity: 0.15 + Math.random() * 0.1,
        bounce: 0.5 + Math.random() * 0.3,
        life: 1,
      });
    }
    if (completeAnimId) cancelAnimationFrame(completeAnimId);
    function tick() {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < completeConfetti.length; i++) {
        var p = completeConfetti[i];
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        if (p.y > H - 10) {
          p.y = H - 10;
          p.vy *= -p.bounce;
          p.vx *= 0.8;
          p.rotV *= 0.7;
        }
        if (p.x < -20) p.x = W + 20;
        if (p.x > W + 20) p.x = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (document.getElementById('scr-complete') && document.getElementById('scr-complete').style.display !== 'none') {
        completeAnimId = requestAnimationFrame(tick);
      }
    }
    tick();
  }
  function stopConfetti() {
    if (completeAnimId) { cancelAnimationFrame(completeAnimId); completeAnimId = 0; }
  }
  function btnPlayAgain() {
    sdkAd('interstitial').then(function () {
      stopConfetti();
      S.unlocked = 500;
      saveProgress();
      S.currentLevel = 1;
      S.state = 'home';
      show('home');
      updateHomeUI();
    });
  }
  function btnLevelsFromComplete() {
    sdkAd('interstitial').then(function () {
      stopConfetti();
      S.unlocked = 500;
      saveProgress();
      show('select');
      buildSelectGrid();
    });
  }
  function btnHomeFromComplete() {
    sdkAd('interstitial').then(function () {
      stopConfetti();
      S.unlocked = 500;
      saveProgress();
      S.state = 'home';
      show('home');
      updateHomeUI();
    });
  }

  function toggleSound() {
    var v = !SnakeAudio.enabled;
    SnakeAudio.setEnabled(v);
    updateSoundUI();
  }
  function toggleMusic() {
    var v = !SnakeAudio.musicOn;
    SnakeAudio.setMusic(v);
    updateSoundUI();
  }
  function updateSoundUI() {
    var el;
    el = document.getElementById('snd-btn');
    if (el) { if (SnakeAudio.enabled) el.classList.add('on'); else el.classList.remove('on'); }
    el = document.getElementById('mus-btn');
    if (el) { if (SnakeAudio.musicOn) el.classList.add('on'); else el.classList.remove('on'); }
  }
  return {
    init: init,
    btnHome: btnHome, btnLevels: btnLevels,
    btnRestart: btnRestart,
    btnNext: btnNext, btnReplay: btnReplay, btnRetry: btnRetry,
    btnHowto: btnHowto, btnHowtoBack: btnHowtoBack,
    btnUndo: btnUndo, btnHint: btnHint,
    btnRewatchAd: btnRewatchAd, btnRewatchHint: btnRewatchHint,
    btnPlayAgain: btnPlayAgain, btnLevelsFromComplete: btnLevelsFromComplete, btnHomeFromComplete: btnHomeFromComplete,
    toggleSound: toggleSound, toggleMusic: toggleMusic,
  };
})();
