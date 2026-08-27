'use strict';
var SnakeCore = (function () {
  var DIRS = [{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];
  var COLORS = ['#E53935','#8E24AA','#1E88E5','#43A047','#FB8C00','#00ACC1','#D81B60','#5E35B1','#3949AB','#00897B','#F4511E','#6D4C41','#546E7A','#7CB342','#C0CA33'];

  var COLLECTIBLES = [
    { emoji: '\uD83D\uDC8E', name: 'Diamond', points: 50, color: '#4FC3F7' },
    { emoji: '\uD83C\uDF55', name: 'Pizza', points: 30, color: '#FF7043' },
    { emoji: '\u2B50', name: 'Star', points: 40, color: '#FFD54F' },
    { emoji: '\uD83E\uDDEA', name: 'Potion', points: 35, color: '#AB47BC' },
    { emoji: '\uD83C\uDF40', name: 'Clover', points: 25, color: '#66BB6A' },
    { emoji: '\uD83D\uDC8A', name: 'Gem', points: 45, color: '#EF5350' },
    { emoji: '\uD83E\uDD99', name: 'Coin', points: 20, color: '#FFA726' },
    { emoji: '\u2728', name: 'Sparkle', points: 15, color: '#FFF176' },
  ];

  var WORLDS = [
    { name: 'Meadow', bg1: '#1a3a1a', bg2: '#0a2010', accent: '#4CAF50', icon: '\uD83C\uDF3F' },
    { name: 'Ocean', bg1: '#0a1a3a', bg2: '#061020', accent: '#2196F3', icon: '\uD83C\uDF0A' },
    { name: 'Volcano', bg1: '#3a1a0a', bg2: '#200a06', accent: '#FF5722', icon: '\uD83C\uDF0B' },
    { name: 'Sky', bg1: '#1a2a4a', bg2: '#0a1530', accent: '#90CAF9', icon: '\u2601\uFE0F' },
    { name: 'Desert', bg1: '#3a2a0a', bg2: '#201806', accent: '#FFB74D', icon: '\uD83C\uDFDC\uFE0F' },
    { name: 'Forest', bg1: '#0a2a1a', bg2: '#061a0e', accent: '#2E7D32', icon: '\uD83C\uDF32' },
    { name: 'Crystal', bg1: '#1a1a3a', bg2: '#0e0e20', accent: '#CE93D8', icon: '\uD83D\uDC8E' },
    { name: 'Night', bg1: '#0a0a2a', bg2: '#05051a', accent: '#7C4DFF', icon: '\uD83C\uDF19' },
    { name: 'Fire', bg1: '#3a0a0a', bg2: '#200505', accent: '#FF1744', icon: '\uD83D\uDD25' },
    { name: 'Cosmos', bg1: '#1a0a2a', bg2: '#0e0518', accent: '#E040FB', icon: '\uD83C\uDF0C' },
  ];

  var TUTORIAL_LEVELS = {
    1: { W:3, H:3, snakes:[
      {id:0,x:2,y:0,dir:{dx:1,dy:0},len:3,colorIdx:4,placeIdx:0,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:2,y:0},{x:1,y:0},{x:0,y:0}]},
      {id:1,x:2,y:1,dir:{dx:1,dy:0},len:3,colorIdx:0,placeIdx:1,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:2,y:1},{x:1,y:1},{x:0,y:1}]},
      {id:2,x:2,y:2,dir:{dx:1,dy:0},len:3,colorIdx:2,placeIdx:2,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:2,y:2},{x:1,y:2},{x:0,y:2}]},
    ], stones:[], wrap:false, mech:{ice:false,stone:false,dbl:false,gold:false,wrap:false,lshape:false,chain:false}, parMoves:3 },
    2: { W:3, H:3, snakes:[
      {id:0,x:0,y:0,dir:{dx:-1,dy:0},len:3,colorIdx:4,placeIdx:0,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:0,y:0},{x:1,y:0},{x:2,y:0}]},
      {id:1,x:1,y:1,dir:{dx:1,dy:0},len:2,colorIdx:0,placeIdx:1,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:1,y:1},{x:0,y:1}]},
      {id:2,x:0,y:2,dir:{dx:-1,dy:0},len:3,colorIdx:2,placeIdx:2,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:0,y:2},{x:1,y:2},{x:2,y:2}]},
    ], stones:[], wrap:false, mech:{ice:false,stone:false,dbl:false,gold:false,wrap:false,lshape:false,chain:false}, parMoves:3 },
    3: { W:4, H:3, snakes:[
      {id:0,x:3,y:0,dir:{dx:1,dy:0},len:4,colorIdx:4,placeIdx:0,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:0},{x:2,y:0},{x:1,y:0},{x:0,y:0}]},
      {id:1,x:1,y:1,dir:{dx:1,dy:0},len:2,colorIdx:0,placeIdx:1,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:1,y:1},{x:0,y:1}]},
      {id:2,x:3,y:2,dir:{dx:1,dy:0},len:4,colorIdx:2,placeIdx:2,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:2},{x:2,y:2},{x:1,y:2},{x:0,y:2}]},
      {id:3,x:3,y:1,dir:{dx:1,dy:0},len:2,colorIdx:6,placeIdx:3,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:1},{x:2,y:1}]},
    ], stones:[], wrap:false, mech:{ice:false,stone:false,dbl:false,gold:false,wrap:false,lshape:false,chain:false}, parMoves:4 },
    4: { W:4, H:3, snakes:[
      {id:0,x:3,y:0,dir:{dx:1,dy:0},len:4,colorIdx:4,placeIdx:0,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:0},{x:2,y:0},{x:1,y:0},{x:0,y:0}]},
      {id:1,x:1,y:1,dir:{dx:1,dy:0},len:2,colorIdx:0,placeIdx:1,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:1,y:1},{x:0,y:1}]},
      {id:2,x:3,y:2,dir:{dx:1,dy:0},len:4,colorIdx:2,placeIdx:2,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:2},{x:2,y:2},{x:1,y:2},{x:0,y:2}]},
      {id:3,x:3,y:1,dir:{dx:1,dy:0},len:2,colorIdx:6,placeIdx:3,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:1},{x:2,y:1}]},
    ], stones:[], wrap:false, mech:{ice:false,stone:false,dbl:false,gold:false,wrap:false,lshape:false,chain:false}, parMoves:4 },
    5: { W:4, H:4, snakes:[
      {id:0,x:3,y:0,dir:{dx:1,dy:0},len:4,colorIdx:4,placeIdx:0,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:0},{x:2,y:0},{x:1,y:0},{x:0,y:0}]},
      {id:1,x:1,y:1,dir:{dx:1,dy:0},len:2,colorIdx:0,placeIdx:1,hp:2,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:1,y:1},{x:0,y:1}]},
      {id:2,x:3,y:2,dir:{dx:1,dy:0},len:4,colorIdx:2,placeIdx:2,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:2},{x:2,y:2},{x:1,y:2},{x:0,y:2}]},
      {id:3,x:3,y:1,dir:{dx:1,dy:0},len:2,colorIdx:6,placeIdx:3,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:1},{x:2,y:1}]},
      {id:4,x:1,y:3,dir:{dx:1,dy:0},len:2,colorIdx:4,placeIdx:4,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:1,y:3},{x:0,y:3}]},
      {id:5,x:3,y:3,dir:{dx:1,dy:0},len:2,colorIdx:2,placeIdx:5,hp:1,golden:false,dbl:false,lshape:false,lockKey:0,cells:[{x:3,y:3},{x:2,y:3}]},
    ], stones:[], wrap:false, mech:{ice:true,stone:false,dbl:false,gold:false,wrap:false,lshape:false,chain:false}, parMoves:6 },
  };

  function mulberry32(s) { var a = s >>> 0; return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hashL(L) { return ((L * 2654435761) ^ 0x9e3779b9) >>> 0; }

  function mechFor(L) {
    if (L <= 4) return { ice: false, stone: false, dbl: false, gold: false, wrap: false, lshape: false, chain: false };
    if (L <= 9) return { ice: true, stone: false, dbl: false, gold: false, wrap: false, lshape: false, chain: false };
    if (L <= 19) return { ice: true, stone: false, dbl: false, gold: true, wrap: false, lshape: false, chain: false };
    if (L <= 34) return { ice: true, stone: false, dbl: false, gold: true, wrap: false, lshape: false, chain: false };
    return { ice: true, stone: false, dbl: false, gold: true, wrap: false, lshape: false, chain: true };
  }

  function getWorld(L) { return WORLDS[((L - 1) / 10 | 0) % WORLDS.length]; }

  function collectiblesForLevel(L) {
    if (L < 3) return 0;
    var rng = mulberry32(hashL(L + 9999));
    if (L <= 10) return 1 + Math.floor(rng() * 2);
    if (L <= 30) return 2 + Math.floor(rng() * 2);
    if (L <= 60) return 2 + Math.floor(rng() * 3);
    if (L <= 100) return 3 + Math.floor(rng() * 3);
    if (L <= 200) return 3 + Math.floor(rng() * 4);
    if (L <= 350) return 4 + Math.floor(rng() * 3);
    return 4 + Math.floor(rng() * 4);
  }

  function collectibleTypeForLevel(L) {
    var rng = mulberry32(hashL(L + 7777));
    return Math.floor(rng() * COLLECTIBLES.length);
  }

  function collectibleTypesForLevel(L) {
    if (L < 30) return [collectibleTypeForLevel(L)];
    if (L < 100) {
      if (Math.floor(hashL(L) % 3) === 0) {
        var t = collectibleTypeForLevel(L);
        var t2 = (t + 1 + Math.floor(hashL(L) % (COLLECTIBLES.length - 1))) % COLLECTIBLES.length;
        return [t, t2];
      }
      return [collectibleTypeForLevel(L)];
    }
    if (L < 250) {
      var t = collectibleTypeForLevel(L);
      var t2 = (t + 1 + Math.floor(hashL(L) % (COLLECTIBLES.length - 1))) % COLLECTIBLES.length;
      return [t, t2];
    }
    var t = collectibleTypeForLevel(L);
    var t2 = (t + 1 + Math.floor(hashL(L) % (COLLECTIBLES.length - 1))) % COLLECTIBLES.length;
    var t3 = (t + 3 + Math.floor(hashL(L + 1) % (COLLECTIBLES.length - 1))) % COLLECTIBLES.length;
    return [t, t2, t3];
  }

  function lParams(L, seedOffset) {
    var rng = mulberry32(hashL(L) + (seedOffset || 0));
    var m = mechFor(L);
    var w, h;
    if (L <= 4) { w = 3; h = 3; }
    else if (L <= 10) { w = 4; h = 3 + (rng() < 0.4 ? 1 : 0); }
    else if (L <= 20) { w = 5 + Math.floor(rng() * 1.5); h = 4 + Math.floor(rng() * 1.5); }
    else if (L <= 35) { w = 6 + Math.floor(rng() * 1.5); h = 5 + Math.floor(rng() * 1.5); }
    else if (L <= 60) { w = 7 + Math.floor(rng() * 1.5); h = 6 + Math.floor(rng() * 1.5); }
    else if (L <= 100) { w = 8 + Math.floor(rng() * 2); h = 7 + Math.floor(rng() * 2); }
    else if (L <= 200) { w = 9 + Math.floor(rng() * 1.5); h = 8 + Math.floor(rng() * 1.5); }
    else if (L <= 350) { w = 10; h = 8 + Math.floor(rng() * 2); }
    else { w = 10; h = 9 + Math.floor(rng() * 1.5); }
    if (w > 10) w = 10; if (h > 10) h = 10; if (w < 3) w = 3; if (h < 3) h = 3;
    if (rng() < 0.35) { var t = w; w = h; h = t; }
    var boardCells = w * h;
    var iceP, goldP, lP, cP;
    if (L <= 4) {
      iceP = 0; goldP = 0; lP = 0; cP = 0;
    } else if (L <= 10) {
      iceP = Math.min(0.2, 0.05 + (L - 5) * 0.03 + rng() * 0.04);
      goldP = 0; lP = 0; cP = 0;
    } else if (L <= 20) {
      iceP = Math.min(0.3, 0.1 + (L - 11) * 0.02 + rng() * 0.04);
      goldP = m.gold ? Math.min(0.12, 0.03 + (L - 11) * 0.01 + rng() * 0.02) : 0;
      lP = Math.min(0.12, 0.02 + (L - 11) * 0.01 + rng() * 0.02);
      cP = 0;
    } else if (L <= 35) {
      iceP = Math.min(0.35, 0.15 + (L - 21) * 0.013 + rng() * 0.04);
      goldP = Math.min(0.18, 0.05 + (L - 21) * 0.008 + rng() * 0.03);
      lP = Math.min(0.2, 0.06 + (L - 21) * 0.01 + rng() * 0.03);
      cP = 0;
    } else if (L <= 60) {
      iceP = Math.min(0.4, 0.2 + (L - 36) * 0.008 + rng() * 0.04);
      goldP = Math.min(0.25, 0.08 + (L - 36) * 0.006 + rng() * 0.03);
      lP = Math.min(0.25, 0.08 + (L - 36) * 0.007 + rng() * 0.03);
      cP = Math.max(1, Math.round(boardCells * 0.08));
    } else if (L <= 100) {
      iceP = Math.min(0.45, 0.25 + (L - 61) * 0.005 + rng() * 0.04);
      goldP = Math.min(0.3, 0.1 + (L - 61) * 0.005 + rng() * 0.03);
      lP = Math.min(0.3, 0.1 + (L - 61) * 0.005 + rng() * 0.03);
      cP = Math.max(1, Math.round(boardCells * 0.07));
    } else if (L <= 200) {
      iceP = Math.min(0.5, 0.3 + (L - 101) * 0.002 + rng() * 0.03);
      goldP = Math.min(0.35, 0.12 + (L - 101) * 0.003 + rng() * 0.03);
      lP = Math.min(0.35, 0.12 + (L - 101) * 0.002 + rng() * 0.03);
      cP = Math.max(1, Math.round(boardCells * 0.06));
    } else {
      iceP = Math.min(0.5, 0.32 + rng() * 0.03);
      goldP = Math.min(0.35, 0.15 + rng() * 0.05);
      lP = Math.min(0.35, 0.15 + rng() * 0.04);
      cP = Math.max(1, Math.round(boardCells * 0.05));
    }
    return { rng: rng, m: m, w: w, h: h, iceP: iceP, goldP: goldP, lP: lP, cP: cP };
  }

  function mkGrid(w, h, v) { var g = new Array(h); for (var y = 0; y < h; y++) g[y] = new Array(w).fill(v); return g; }

  function corrClear(x, y, d, occ, w, h, wrap, excludeId) {
    var cx = x + d.dx, cy = y + d.dy, st = 0, wrd = false;
    while (st < w + h + 6) {
      if (cx < 0 || cx >= w || cy < 0 || cy >= h) {
        if (!wrap) return true;
        if (wrd) return true;
        wrd = true; cx = ((cx % w) + w) % w; cy = ((cy % h) + h) % h;
      }
      var v = occ[cy][cx];
      if (v === -2) return false;
      if (v !== -1 && v !== excludeId && v !== -3) return false;
      cx += d.dx; cy += d.dy; st++;
    }
    return true;
  }

  function exitDirs(s) {
    var d = [{ dx: s.dir.dx, dy: s.dir.dy }];
    if (s.dbl) d.push({ dx: -s.dir.dx, dy: -s.dir.dy });
    return d;
  }

  function canExitNow(lv, s, occ) {
    if (s.alive === false || s.hp > 1) return false;
    if (s.lockKey) {
      for (var i = 0; i < lv.snakes.length; i++) {
        if (lv.snakes[i].id === s.lockKey && lv.snakes[i].alive) return false;
      }
    }
    var ds = exitDirs(s);
    for (var i = 0; i < ds.length; i++) {
      var d = ds[i];
      var cc = corrClear(s.x, s.y, d, occ, lv.W, lv.H, lv.wrap, s.id);
      if (!cc) continue;
      if (s.lshape && s.cells.length > 2) {
        var ok = true;
        for (var ci = 0; ci < s.cells.length; ci++) {
          var cell = s.cells[ci];
          if (cell.x === s.x && cell.y === s.y) continue;
          if (!corrClear(cell.x, cell.y, d, occ, lv.W, lv.H, lv.wrap, s.id)) { ok = false; break; }
        }
        if (!ok) continue;
      }
      return true;
    }
    return false;
  }

  function canCrack(s) { return s.alive && s.hp > 1; }

  function getBlocker(lv, s, occ) {
    var ds = exitDirs(s);
    for (var di = 0; di < ds.length; di++) {
      var d = ds[di];
      var cells = s.lshape && s.cells.length > 2 ? s.cells : [{ x: s.x, y: s.y }];
      for (var ci = 0; ci < cells.length; ci++) {
        var cx = cells[ci].x + d.dx, cy = cells[ci].y + d.dy, st = 0, wrd = false;
        while (st < lv.W + lv.H + 6) {
          if (cx < 0 || cx >= lv.W || cy < 0 || cy >= lv.H) {
            if (!lv.wrap || wrd) break;
            wrd = true; cx = ((cx % lv.W) + lv.W) % lv.W; cy = ((cy % lv.H) + lv.H) % lv.H;
          }
          var v = occ[cy][cx];
          if (v === -2) return { type: 'wall', x: cx, y: cy };
          if (v !== -1 && v !== s.id) {
            for (var i = 0; i < lv.snakes.length; i++) {
              if (lv.snakes[i].id === v && lv.snakes[i].alive) return { type: 'snake', snake: lv.snakes[i] };
            }
          }
          cx += d.dx; cy += d.dy; st++;
        }
      }
    }
    return null;
  }

  function genLevel(L, seedOffset) {
    if (TUTORIAL_LEVELS[L]) {
      var tut = TUTORIAL_LEVELS[L];
      tut.collectibles = [];
      return tut;
    }
    var p = lParams(L, seedOffset), rng = p.rng, m = p.m, w = p.w, h = p.h;
    var occ = mkGrid(w, h, -1);
    var stones = [];
    var snakes = [], nid = 0;

    var DIRS4 = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];

    function makeCellSnake(cx, cy, dir) {
      var cells = [{ x: cx, y: cy }];
      var s = {
        id: nid, x: cx, y: cy,
        dir: dir,
        len: 1, cells: cells,
        colorIdx: Math.floor(rng() * COLORS.length),
        placeIdx: snakes.length, alive: true,
        hp: 1,
        golden: false,
        dbl: false,
        lshape: false, lockKey: 0,
      };
      occ[cy][cx] = nid;
      nid++;
      snakes.push(s);
      return s;
    }

    var totalCells = w * h;

    var cellPos = [];
    for (var cy = 0; cy < h; cy++) {
      for (var cx = 0; cx < w; cx++) {
        cellPos.push({ x: cx, y: cy });
      }
    }

    var edgeDist = [];
    for (var i = 0; i < totalCells; i++) {
      var pos = cellPos[i];
      var d = Math.min(pos.x, w - 1 - pos.x, pos.y, h - 1 - pos.y);
      edgeDist.push(d);
    }

    var removalOrder = [];
    for (var i = 0; i < totalCells; i++) removalOrder.push(i);
    for (var ri = removalOrder.length - 1; ri > 0; ri--) {
      var rj = Math.floor(rng() * (ri + 1));
      var t = removalOrder[ri]; removalOrder[ri] = removalOrder[rj]; removalOrder[rj] = t;
    }

    removalOrder.sort(function(a, b) {
      if (edgeDist[a] !== edgeDist[b]) return edgeDist[a] - edgeDist[b];
      return a - b;
    });

    var grouped = [];
    for (var gi = 0; gi < removalOrder.length; gi++) {
      var ed = edgeDist[removalOrder[gi]];
      if (grouped.length === 0 || edgeDist[grouped[grouped.length - 1][0]] !== ed) {
        grouped.push([]);
      }
      grouped[grouped.length - 1].push(removalOrder[gi]);
    }
    for (var gi = 0; gi < grouped.length; gi++) {
      var grp = grouped[gi];
      for (var gsi = grp.length - 1; gsi > 0; gsi--) {
        var gj = Math.floor(rng() * (gsi + 1));
        var gt = grp[gsi]; grp[gsi] = grp[gj]; grp[gj] = gt;
      }
    }
    removalOrder = [];
    for (var gi = 0; gi < grouped.length; gi++) {
      for (var gj = 0; gj < grouped[gi].length; gj++) removalOrder.push(grouped[gi][gj]);
    }

    var placed = mkGrid(w, h, false);

    for (var pi = totalCells - 1; pi >= 0; pi--) {
      var cellIdx = removalOrder[pi];
      var pos = cellPos[cellIdx];
      var cx = pos.x, cy = pos.y;

      var validDirs = [];
      for (var di = 0; di < 4; di++) {
        var d = DIRS4[di];
        var clear = true;
        var nx = cx + d.dx, ny = cy + d.dy;
        while (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          if (placed[ny][nx]) { clear = false; break; }
          nx += d.dx; ny += d.dy;
        }
        if (clear) validDirs.push(d);
      }

      var pick;
      if (validDirs.length > 0) {
        pick = validDirs[Math.floor(rng() * validDirs.length)];
      } else {
        pick = DIRS4[Math.floor(rng() * 4)];
      }
      makeCellSnake(cx, cy, { dx: pick.dx, dy: pick.dy });
      placed[cy][cx] = true;
    }

    var nLock = Math.min(Math.floor(totalCells * p.lP), Math.floor(totalCells * 0.35));
    if (nLock > 0 && snakes.length >= 4) {
      var candidates = [];
      for (var i = 0; i < snakes.length; i++) {
        var s = snakes[i];
        if (s.x > 0 && s.x < w - 1 && s.y > 0 && s.y < h - 1) candidates.push(i);
      }
      for (var ci2 = candidates.length - 1; ci2 > 0; ci2--) {
        var rj = Math.floor(rng() * (ci2 + 1));
        var t = candidates[ci2]; candidates[ci2] = candidates[rj]; candidates[rj] = t;
      }
      var locked = 0;
      var usedAsKey = {};
      for (var li = 0; li < candidates.length && locked < nLock; li++) {
        var lIdx = candidates[li];
        var lSnake = snakes[lIdx];
        if (lSnake.lockKey !== 0 || usedAsKey[lIdx]) continue;
        var keys = [];
        for (var ki = 0; ki < snakes.length; ki++) {
          if (ki === lIdx) continue;
          if (snakes[ki].id > lSnake.id && snakes[ki].lockKey === 0 && !usedAsKey[ki]) keys.push(ki);
        }
        if (keys.length > 0) {
          var kIdx = keys[Math.floor(rng() * keys.length)];
          lSnake.lockKey = snakes[kIdx].id;
          usedAsKey[lIdx] = true;
          usedAsKey[kIdx] = true;
          locked++;
        }
      }
    }

    var nIce = Math.floor(totalCells * p.iceP);
    var iceCount = 0;
    for (var ii = 0; ii < snakes.length && iceCount < nIce; ii++) {
      var ri = Math.floor(rng() * snakes.length);
      if (snakes[ri].hp <= 1 && snakes[ri].lockKey === 0) {
        snakes[ri].hp = 2;
        iceCount++;
      }
    }

    var nGold = Math.floor(totalCells * p.goldP);
    var goldCount = 0;
    for (var gi = 0; gi < snakes.length && goldCount < nGold; gi++) {
      var rgi = Math.floor(rng() * snakes.length);
      if (!snakes[rgi].golden) {
        snakes[rgi].golden = true;
        goldCount++;
      }
    }

    var nCol = collectiblesForLevel(L);
    var types = collectibleTypesForLevel(L);
    var colls = [];
    for (var ci3 = 0; ci3 < nCol; ci3++) {
      for (var att = 0; att < 30; att++) {
        var rcx = Math.floor(rng() * w), rcy = Math.floor(rng() * h);
        if (occ[rcy][rcx] >= 0) {
          var ctype = COLLECTIBLES[types[ci3 % types.length]];
          colls.push({ x: rcx, y: rcy, type: ctype });
          break;
        }
      }
    }

    function ensureSolvable(lv) {
      var maxAttempts = 20;
      for (var attempt = 0; attempt < maxAttempts; attempt++) {
        var occ2 = mkGrid(lv.W, lv.H, -1);
        for (var si = 0; si < lv.stones.length; si++) occ2[lv.stones[si].y][lv.stones[si].x] = -2;
        var rem = lv.snakes.map(function(s) { return { id: s.id, hp: s.hp, lockKey: s.lockKey, alive: true }; });
        var snakeMap = {};
        for (var si = 0; si < lv.snakes.length; si++) snakeMap[lv.snakes[si].id] = lv.snakes[si];
        var iters = 0;
        while (rem.length > 0 && iters < 500) {
          var freed = 0;
          for (var ri = rem.length - 1; ri >= 0; ri--) {
            var s = rem[ri];
            if (s.lockKey) {
              var kh = rem.find(function(r) { return r.id === s.lockKey && r.alive; });
              if (kh) continue;
            }
            var realSnake = snakeMap[s.id];
            if (s.hp > 1) {
              s.hp = 1;
              realSnake.hp = 1;
              freed++;
              continue;
            }
            if (canExitNow(lv, realSnake, occ2)) {
              s.alive = false;
              realSnake.alive = false;
              for (var ci = 0; ci < realSnake.cells.length; ci++) {
                occ2[realSnake.cells[ci].y][realSnake.cells[ci].x] = -1;
              }
              rem.splice(ri, 1);
              freed++;
            }
          }
          if (freed === 0) break;
          iters++;
        }
        if (rem.length === 0) return;
        for (var ri = 0; ri < rem.length; ri++) {
          var stuckSnake = snakeMap[rem[ri].id];
          if (stuckSnake.lockKey) { stuckSnake.lockKey = 0; rem[ri].lockKey = 0; }
          else if (stuckSnake.hp > 1) { stuckSnake.hp = 1; rem[ri].hp = 1; }
        }
      }
    }

    ensureSolvable({ W: w, H: h, snakes: snakes, stones: stones });

    return { W: w, H: h, snakes: snakes, stones: stones, wrap: false, mech: m, parMoves: snakes.length, collectibles: colls, world: getWorld(L) };
  }

  function initOcc(lv) {
    var occ = mkGrid(lv.W, lv.H, -1);
    if (lv.stones) for (var i = 0; i < lv.stones.length; i++) occ[lv.stones[i].y][lv.stones[i].x] = -2;
    if (lv.collectibles) for (var i = 0; i < lv.collectibles.length; i++) occ[lv.collectibles[i].y][lv.collectibles[i].x] = -3;
    for (var i = 0; i < lv.snakes.length; i++) {
      var s = lv.snakes[i];
      if (s.alive !== false) for (var j = 0; j < s.cells.length; j++) occ[s.cells[j].y][s.cells[j].x] = s.id;
    }
    return occ;
  }

  function findFree(lv, occ) {
    var f = [];
    for (var i = 0; i < lv.snakes.length; i++) {
      var s = lv.snakes[i];
      if (s.alive === false || s.hp > 1) continue;
      if (s.lockKey) {
        var locked = false;
        for (var j = 0; j < lv.snakes.length; j++) {
          if (lv.snakes[j].id === s.lockKey && lv.snakes[j].alive) { locked = true; break; }
        }
        if (locked) continue;
      }
      if (canExitNow(lv, s, occ)) f.push(s);
    }
    return f;
  }

  function lockingSnake(lv, s) {
    if (!s.lockKey) return null;
    for (var i = 0; i < lv.snakes.length; i++) {
      if (lv.snakes[i].id === s.lockKey && lv.snakes[i].alive) return lv.snakes[i];
    }
    return null;
  }

  function isCleared(lv) { for (var i = 0; i < lv.snakes.length; i++) if (lv.snakes[i].alive) return false; return true; }
  function calcStars(m) { return m === 0 ? 3 : m <= 2 ? 2 : 1; }

  function solveLvFast(lv) {
    var occ = initOcc(lv);
    var lc = lv.snakes.map(function (s) {
      return { id: s.id, x: s.x, y: s.y, dir: { dx: s.dir.dx, dy: s.dir.dy }, cells: s.cells, hp: s.hp || 1, lockKey: s.lockKey || 0, dbl: s.dbl, lshape: s.lshape, alive: true, placeIdx: s.placeIdx, golden: s.golden, colorIdx: s.colorIdx };
    });
    var lvl = { W: lv.W, H: lv.H, wrap: lv.wrap, snakes: lc };
    var rem = lc.length;
    var removalOrder = [];
    for (var pass = 0; pass < lc.length + 10; pass++) {
      if (rem === 0) break;
      var progress = false;
      for (var i = 0; i < lc.length; i++) {
        var s = lc[i];
        if (!s.alive || s.hp > 1) continue;
        if (s.lockKey) {
          var locked = false;
          for (var j = 0; j < lc.length; j++) { if (lc[j].id === s.lockKey && lc[j].alive) { locked = true; break; } }
          if (locked) continue;
        }
        if (canExitNow(lvl, s, occ)) {
          s.alive = false;
          for (var j = 0; j < s.cells.length; j++) occ[s.cells[j].y][s.cells[j].x] = -1;
          rem--;
          removalOrder.push(s.id);
          progress = true;
        }
      }
      if (progress) continue;
      for (var i = 0; i < lc.length; i++) {
        if (!lc[i].alive || lc[i].hp <= 1) continue;
        lc[i].hp = 1;
        progress = true;
        break;
      }
      if (!progress) break;
    }
    return { ok: rem === 0, left: rem, removalOrder: removalOrder };
  }

  function solveLv(lv) {
    var occ = initOcc(lv);
    var lc = lv.snakes.map(function (s) {
      return { id: s.id, x: s.x, y: s.y, dir: { dx: s.dir.dx, dy: s.dir.dy }, cells: s.cells, hp: s.hp || 1, lockKey: s.lockKey || 0, dbl: s.dbl, lshape: s.lshape, alive: true, placeIdx: s.placeIdx, golden: s.golden, colorIdx: s.colorIdx };
    });
    var lvl = { W: lv.W, H: lv.H, wrap: lv.wrap, snakes: lc };
    var rem = lc.length;
    var removalOrder = [];

    function saveState() {
      var o = occ.map(function (r) { return r.slice(); });
      var a = lc.map(function (s) { return s.alive; });
      var h = lc.map(function (s) { return s.hp; });
      return { occ: o, alive: a, hp: h, rem: rem, order: removalOrder.slice() };
    }

    function restoreState(st) {
      for (var y = 0; y < occ.length; y++) for (var x = 0; x < occ[y].length; x++) occ[y][x] = st.occ[y][x];
      for (var j = 0; j < lc.length; j++) { lc[j].alive = st.alive[j]; lc[j].hp = st.hp[j]; }
      rem = st.rem;
      removalOrder.length = st.order.length;
      for (var j = 0; j < st.order.length; j++) removalOrder[j] = st.order[j];
    }

    function findFreeSnakes() {
      var free = [];
      for (var i = 0; i < lc.length; i++) {
        var s = lc[i];
        if (!s.alive) continue;
        if (s.hp > 1) continue;
        if (s.lockKey) {
          var locked = false;
          for (var j = 0; j < lc.length; j++) { if (lc[j].id === s.lockKey && lc[j].alive) { locked = true; break; } }
          if (locked) continue;
        }
        if (canExitNow(lvl, s, occ)) free.push(i);
      }
      return free;
    }

    function findIceSnakes() {
      var ice = [];
      for (var i = 0; i < lc.length; i++) {
        var s = lc[i];
        if (!s.alive || s.hp <= 1) continue;
        if (s.lockKey) {
          var locked = false;
          for (var j = 0; j < lc.length; j++) { if (lc[j].id === s.lockKey && lc[j].alive) { locked = true; break; } }
          if (locked) continue;
        }
        ice.push(i);
      }
      return ice;
    }

    function solve(depth) {
      if (rem === 0) return true;
      if (depth > 200) return false;

      for (var pass = 0; pass < 200; pass++) {
        var progress = false;
        var free = findFreeSnakes();
        for (var fi = 0; fi < free.length; fi++) {
          var si = free[fi];
          var s = lc[si];
          s.alive = false;
          for (var j = 0; j < s.cells.length; j++) occ[s.cells[j].y][s.cells[j].x] = -1;
          rem--;
          removalOrder.push(s.id);
          progress = true;
        }
        if (rem === 0) return true;
        if (!progress) break;
      }

      var stuckState = saveState();
      var free = findFreeSnakes();
      if (free.length > 0) {
        free.sort(function(a, b) { return lc[b].cells.length - lc[a].cells.length; });
        for (var fi = 0; fi < free.length; fi++) {
          restoreState(stuckState);
          var si = free[fi];
          var s = lc[si];
          s.alive = false;
          for (var j = 0; j < s.cells.length; j++) occ[s.cells[j].y][s.cells[j].x] = -1;
          rem--;
          removalOrder.push(s.id);
          if (solve(depth + 1)) return true;
        }
        restoreState(stuckState);
        return false;
      }
      var ice = findIceSnakes();
      for (var ii = 0; ii < ice.length; ii++) {
        restoreState(stuckState);
        var si2 = ice[ii];
        lc[si2].hp = 1;
        if (solve(depth + 1)) return true;
      }
      restoreState(stuckState);
      return false;
    }

    var ok = solve(0);
    return { ok: ok, left: rem, removalOrder: removalOrder };
  }

  function verifySolvable(lv) {
    var occ = initOcc(lv);
    var n = lv.snakes.length;
    var alive = [];
    var hpArr = [];
    var origHp = [];
    for (var i = 0; i < n; i++) { alive.push(true); hpArr.push(lv.snakes[i].hp || 1); origHp.push(lv.snakes[i].hp || 1); }
    var rem = n;
    var tmpSnakes = lv.snakes.map(function (s) {
      return { id: s.id, x: s.x, y: s.y, dir: { dx: s.dir.dx, dy: s.dir.dy }, cells: s.cells, hp: s.hp || 1, lockKey: s.lockKey || 0, dbl: s.dbl, lshape: s.lshape, alive: true };
    });
    function canExit(idx) {
      var s = tmpSnakes[idx];
      if (!alive[idx] || hpArr[idx] > 1) return false;
      if (s.lockKey) {
        for (var j = 0; j < n; j++) {
          if (alive[j] && tmpSnakes[j].id === s.lockKey) return false;
        }
      }
      var ds = exitDirs(s);
      for (var di = 0; di < ds.length; di++) {
        var d = ds[di];
        if (!corrClear(s.x, s.y, d, occ, lv.W, lv.H, lv.wrap, s.id)) continue;
        if (s.lshape && s.cells.length > 2) {
          var ok2 = true;
          for (var ci = 0; ci < s.cells.length; ci++) {
            var cell = s.cells[ci];
            if (cell.x === s.x && cell.y === s.y) continue;
            if (!corrClear(cell.x, cell.y, d, occ, lv.W, lv.H, lv.wrap, s.id)) { ok2 = false; break; }
          }
          if (!ok2) continue;
        }
        return true;
      }
      return false;
    }
    for (var pass = 0; pass < n + 10; pass++) {
      if (rem === 0) return true;
      var progress = false;
      for (var i = 0; i < n; i++) {
        if (!alive[i] || hpArr[i] > 1) continue;
        if (!canExit(i)) continue;
        alive[i] = false;
        for (var j = 0; j < tmpSnakes[i].cells.length; j++) occ[tmpSnakes[i].cells[j].y][tmpSnakes[i].cells[j].x] = -1;
        rem--;
        progress = true;
      }
      if (progress) continue;
      for (var i = 0; i < n; i++) {
        if (!alive[i] || hpArr[i] <= 1) continue;
        hpArr[i] = 1;
        progress = true;
        break;
      }
      if (!progress) return false;
    }
    return rem === 0;
  }

  return {
    DIRS: DIRS, COLORS: COLORS, COLLECTIBLES: COLLECTIBLES, WORLDS: WORLDS, TUTORIAL_LEVELS: TUTORIAL_LEVELS,
    getWorld: getWorld,
    generateLevel: function (L) {
      var best = null, bestScore = -1;
      var fallback = null;
      var maxTries = L <= 10 ? 30 : L <= 50 ? 40 : L <= 200 ? 60 : 80;
      var startTime = Date.now();
      for (var tries = 0; tries < maxTries; tries++) {
        if (Date.now() - startTime > 2000) break;
        var lv = genLevel(L, tries * 7919);
        if (!lv || !lv.snakes || lv.snakes.length < 2) continue;
        if (!fallback) fallback = lv;
        var r = solveLvFast(lv);
        if (!r.ok) continue;
        var snakeCells = 0;
        for (var si = 0; si < lv.snakes.length; si++) snakeCells += lv.snakes[si].cells.length;
        var stoneCount = lv.stones ? lv.stones.length : 0;
        var totalCells = lv.W * lv.H;
        var fillRate = (snakeCells + stoneCount) / totalCells;
        var score = snakeCells * 100 + stoneCount * 10 + Math.round(fillRate * 1000) + lv.snakes.length * 50;
        if (score > bestScore) {
          bestScore = score;
          best = lv;
        }
        if (lv.snakes.length >= 12 && fillRate >= 0.98) break;
      }
      if (!best) best = fallback;
      return best;
    },
    initOcc: initOcc, canExitNow: canExitNow, canCrack: canCrack,
    findFree: findFree, getBlocker: getBlocker, lockingSnake: lockingSnake,
    isCleared: isCleared, calcStars: calcStars, solveLv: solveLv, solveLvFast: solveLvFast,
    mechForLevel: mechFor, hashLevel: hashL, mulberry32: mulberry32,
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SnakeCore;
