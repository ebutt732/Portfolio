/* Fairy dust: a soft, muted lilac-grey glow at the pointer with a trail of tiny sparkles that fall from it, twinkle and fade out.
   A TRIAL on the home page. To try it on another page add  <script src="assets/fairy-dust.js" defer></script>  before </body>;
   to remove it, delete that line (and nothing else changes).
   Only for a real mouse or trackpad; nothing happens on touch screens or for visitors who asked for less motion. */
(function () {
  var fine = matchMedia('(hover:hover) and (pointer:fine)'), calm = matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches || calm.matches) return;

  /* ---- the dials ---- */
  var PER_PX = 1 / 9;      /* sparkles per pixel the pointer moves */
  var IDLE = 8;            /* sparkles per second while the pointer rests */
  var GRAVITY = 60;        /* how fast they gather speed on the way down (px/s each second) */
  var LIFE = [0.7, 1.7];   /* shortest and longest life, seconds */
  var MAX = 180;           /* never more than this many at once */
  var HALO = 26;           /* radius of the glow round the pointer, px */
  var TINT = '184,172,204'; /* the colour of all of it, as r,g,b: a muted lilac grey, never pure white */
  var STRENGTH = 0.68;     /* how visible the sparkles are, 0 to 1 */

  /* over anything you can click (or type into) the dust stops: no new sparkles, the glow fades, and the ones already falling clear away quickly */
  var CLICKABLE = 'a[href],button,input,textarea,select,summary,label,[role="button"],[role="link"],[role="tab"],[onclick],[data-open],.drawer-back';

  var root = document.documentElement;
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483000;pointer-events:none';
  document.body.appendChild(cv);
  var g = cv.getContext('2d');
  if (!g) { cv.remove(); return; }

  /* the older purple glow that follows the pointer on the grid would muddy the white one: turn it down to nothing while this is on */
  root.style.setProperty('--grid-glow-a', '0.0001');
  root.style.setProperty('--grid-core-a', '0.0001');
  root.setAttribute('data-theme', root.getAttribute('data-theme') || 'dark');   /* (re)setting it makes the grid read the colours again */

  /* a soft round dot, drawn once and stamped many times */
  function dot(stops) {
    var s = document.createElement('canvas'); s.width = s.height = 64;
    var c = s.getContext('2d'), gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    stops.forEach(function (st) { gr.addColorStop(st[0], 'rgba(' + TINT + ',' + st[1] + ')'); });
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    return s;
  }
  var SPARK = dot([[0, 1], [0.18, 0.85], [0.42, 0.22], [1, 0]]);
  var GLOW = dot([[0, 0.9], [0.2, 0.45], [0.5, 0.13], [1, 0]]);

  var W = 0, H = 0, parts = [], px = 0, py = 0, inside = false, over = false, halo = 0, owed = 0, raf = 0, last = 0, t = 0;
  function size() {
    var d = Math.min(2, window.devicePixelRatio || 1);
    W = root.clientWidth; H = window.innerHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    g.setTransform(d, 0, 0, d, 0, 0);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  /* the arrow's tip is the pointer position and its body hangs below and to the right, so the dust leaves from there */
  function spawn(x, y) {
    if (parts.length >= MAX) parts.shift();
    var star = Math.random() < 0.12;
    parts.push({
      x: x + 6 + rand(-6, 6), y: y + 9 + rand(-5, 7),
      vx: rand(-16, 16), vy: rand(4, 34),
      age: 0, life: rand(LIFE[0], LIFE[1]),
      r: star ? rand(3, 5.4) : rand(1, 3),
      star: star, phase: rand(0, 6.283), rate: rand(7, 18), sway: rand(4, 14)
    });
  }
  /* a four-pointed twinkle */
  function drawStar(x, y, r, a) {
    var w = r * 0.22;
    g.globalAlpha = a;
    g.beginPath();
    g.moveTo(x, y - r); g.quadraticCurveTo(x + w, y - w, x + r, y);
    g.quadraticCurveTo(x + w, y + w, x, y + r); g.quadraticCurveTo(x - w, y + w, x - r, y);
    g.quadraticCurveTo(x - w, y - w, x, y - r);
    g.fillStyle = 'rgb(' + TINT + ')'; g.fill();
    g.drawImage(SPARK, x - r, y - r, r * 2, r * 2);
  }
  function step(dt) {
    t += dt;
    if (inside && !over) { owed += IDLE * dt; while (owed >= 1) { spawn(px, py); owed -= 1; } } else owed = 0;
    halo += ((inside && !over ? 1 : 0) - halo) * (1 - Math.exp(-dt / (over ? 0.07 : 0.16)));
    g.clearRect(0, 0, W, H);
    if (halo > 0.01) {
      var pulse = 1 + 0.08 * Math.sin(t * 5.2) + 0.04 * Math.sin(t * 13);
      var R = HALO * pulse;
      g.globalAlpha = 0.24 * halo; g.drawImage(GLOW, px + 5 - R, py + 8 - R, R * 2, R * 2);
      g.globalAlpha = 0.07 * halo; g.drawImage(GLOW, px + 5 - R * 2.2, py + 8 - R * 2.2, R * 4.4, R * 4.4);
    }
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.age += over ? dt * 4 : dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.vy += GRAVITY * dt; p.vx *= Math.exp(-dt / 0.9);
      p.x += (p.vx + Math.sin(p.age * 5 + p.phase) * p.sway) * dt;
      p.y += p.vy * dt;
      var k = 1 - p.age / p.life;
      var a = Math.pow(k, 1.05) * (0.74 + 0.26 * Math.sin(p.age * p.rate + p.phase));
      var r = p.r * (0.55 + 0.45 * k);
      a *= STRENGTH;
      if (p.star) drawStar(p.x, p.y, r, Math.max(0, a));
      else { g.globalAlpha = Math.max(0, a); g.drawImage(SPARK, p.x - r * 1.7, p.y - r * 1.7, r * 3.4, r * 3.4); }
    }
    g.globalAlpha = 1;
    return (inside && !over) || parts.length > 0 || halo > 0.01;
  }
  function frame(now) {
    raf = 0;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (step(dt)) raf = requestAnimationFrame(frame); else { last = 0; g.clearRect(0, 0, W, H); }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var x = e.clientX, y = e.clientY;
    check(e.target);
    if (inside && !over) {
      /* leave dust all along the path, not only where each event lands */
      var dx = x - px, dy = y - py, n = Math.min(12, Math.hypot(dx, dy) * PER_PX + Math.random());
      for (var i = 1; i <= n; i++) spawn(px + dx * i / n, py + dy * i / n);
    }
    px = x; py = y; inside = true; kick();
  }, { passive: true });
  /* what is under the pointer; also checked when something slides under a pointer that isn't moving (scrolling, the drifting testimonial cards) */
  function check(el) { over = !!(el && el.closest && el.closest(CLICKABLE)); }
  window.addEventListener('pointerover', function (e) { if (e.pointerType !== 'touch') { check(e.target); kick(); } }, { passive: true });
  window.addEventListener('mouseout', function (e) { if (!e.relatedTarget) { inside = false; kick(); } });
  window.addEventListener('blur', function () { inside = false; kick(); });
  window.addEventListener('resize', size);
  size();
  window.__dust = { step: step, count: function () { return parts.length; } };
})();
