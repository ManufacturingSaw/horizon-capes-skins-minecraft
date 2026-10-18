// Tailor's player model: a blocky 3D player wearing a 64 × 64 skin, drawn on a
// 2D canvas, dressed in the catalog's capes, wings, hats and pets. Capes are
// pixel art in Minecraft's 64 × 32 cape layout, drawn at 4x for an HD look.
// A small renderer (boxes and planes, orthographic, a soft key light, drawn
// back to front) shows it; the mod draws the same art in the game.
(function () {
  'use strict';

  // The catalog, as in catalog/cosmetics.toml: id, name, about, colours, motif, new.
  const ROWS = [
    ['cape.ember', 'Ember', 'Dark red, with a glowing flame mark.', ['#4a0e10', '#ff8a33', '#ffd36b'], 'flame'],
    ['cape.tide', 'Tide', 'Layer on layer of rolling waves.', ['#0e3a4a', '#3fb0b0', '#e9fbf8'], 'waves'],
    ['cape.moss', 'Moss', 'Deep green, with leaves climbing the edge.', ['#2f4a25', '#8ab65a', '#f2e3a0'], 'leaves'],
    ['cape.static', 'Static', 'TV noise, with a rolling bright band.', ['#3a3c40', '#a2a5aa', '#f4f5f6'], 'noise'],
    ['cape.aurora', 'Aurora', 'Soft bands of green and violet light on a night sky.', ['#0f1530', '#3fd29a', '#8e7bf0'], 'aurora', 1],
    ['cape.ink', 'Ink', 'One big splash of ink on paper.', ['#f4efe2', '#1a1a22'], 'splash'],
    ['cape.comet', 'Comet', 'A bright streak with a long trail.', ['#121a3a', '#ffe9a8', '#f08a5a'], 'comet'],
    ['cape.lantern', 'Lantern', 'A paper lantern with a warm glow.', ['#2a1012', '#f08a2a', '#fff0b8'], 'lantern'],
    ['cape.glacier', 'Glacier', 'Ice, cut into cold blue facets.', ['#cfe8f3', '#4f8fbf', '#ffffff'], 'facets'],
    ['cape.dune', 'Dune', 'Sand dunes under a low sun.', ['#d9a86a', '#8f5a2c', '#ffe1a8'], 'dunes'],
    ['cape.thistle', 'Thistle', 'A violet thistle in bloom.', ['#3b2a4a', '#a77bd0', '#7fa36b'], 'thistle'],
    ['cape.harbor', 'Harbor', 'Navy and cream stripes with a rope hem.', ['#22385a', '#f1e9d6', '#c98b4a'], 'stripes'],
    ['cape.pine', 'Pine', 'Three pines under a night moon.', ['#16263a', '#2f5a3e', '#eef2f4'], 'pines'],
    ['cape.quartz', 'Quartz', 'A rose quartz cluster.', ['#f3e3ea', '#d39abb', '#ffffff'], 'quartz'],
    ['cape.sable', 'Sable', 'Dark brown with a copper border.', ['#33241f', '#c08a5b', '#e9c18f'], 'border'],
    ['cape.marigold', 'Marigold', 'Golden rays from a rust sun.', ['#f0a92c', '#8a3d12', '#ffd76a'], 'sunburst'],
    ['cape.drift', 'Drift', 'Snow falling on a quiet night.', ['#1e2a48', '#9fb4d8', '#ffffff'], 'snow'],
    ['cape.cinder', 'Cinder', 'Charcoal, with sparks rising from the hem.', ['#1e1d20', '#e4672e', '#ffd36b'], 'sparks'],
    ['cape.fern', 'Fern', 'One long fern frond.', ['#d8e8c0', '#3f7a35', '#8ab65a'], 'fern'],
    ['cape.slate', 'Slate', 'Blue grey roof tiles.', ['#4b5866', '#7d8c9c', '#2f3842'], 'tiles'],
    ['cape.coral', 'Coral', 'Pink coral in a teal sea.', ['#14595e', '#ef7d6b', '#bff0ea'], 'coral'],
    ['cape.orchard', 'Orchard', 'Red and cream check with one apple.', ['#c9473d', '#f3e2c3', '#5d8a3f'], 'check'],
    ['cape.nimbus', 'Nimbus', 'Soft clouds on a clear sky.', ['#6fa3d8', '#ffffff', '#cfe3f5'], 'clouds', 1],
    ['cape.founder', 'Founder', 'Black, with a tape-measure band. For the first month only.', ['#1b1a17', '#f2c230', '#f4f1ea'], 'tape'],
    ['wings.moth', 'Moth', 'Dusty moth wings with two eye spots.', ['#b9a58a', '#6e5b49', '#f1e6d2'], 'moth'],
    ['wings.raven', 'Raven', 'Layered black feathers.', ['#2a2a31', '#4b4b57'], 'feather'],
    ['wings.maple', 'Maple', 'Autumn wings in red and amber.', ['#c4502c', '#e8a04a', '#f6dcae'], 'moth'],
    ['wings.kite', 'Kite', 'Light, sharp wings in blue and cream.', ['#2f5bd3', '#f4f1ea'], 'sprite'],
    ['wings.frost', 'Frost', 'Pale blue feathers.', ['#cfe4f2', '#ffffff'], 'feather'],
    ['wings.gull', 'Gull', 'White feathers with grey tips.', ['#eceae4', '#9aa3ab'], 'feather'],
    ['wings.dusk', 'Dusk', 'Violet wings with a sunset edge.', ['#4a3f6b', '#e48a5c', '#f3c9a8'], 'moth'],
    ['wings.sprite', 'Sprite', 'Thin glassy wings.', ['#9fe0c6', '#e9fbf3'], 'sprite', 1],
    ['hat.beret', 'Beret', 'A soft navy beret, worn at an angle.', ['#2f3b55'], 'beret'],
    ['hat.beanie', 'Beanie', 'Knitted, with a cream cuff and a bobble.', ['#c4502c', '#f4f1ea'], 'beanie'],
    ['hat.bowler', 'Bowler', 'A round black bowler.', ['#26262c', '#4a3f3a'], 'bowler'],
    ['hat.straw', 'Straw', 'A flat straw hat with a red band.', ['#e3c789', '#9e2f2a'], 'boater'],
    ['hat.bucket', 'Bucket', 'A soft green bucket hat.', ['#7fa36b', '#5d7a45'], 'bucket'],
    ['hat.topper', 'Topper', 'A tall black hat with a red band.', ['#1e1e24', '#9e2f2a'], 'topper'],
    ['hat.cloche', 'Cloche', 'A close-fitting rose cloche.', ['#b07a8c', '#7a4a5c'], 'cloche'],
    ['hat.fez', 'Fez', 'Red, with a black tassel.', ['#a8322d', '#1e1e24'], 'fez'],
    ['hat.visor', 'Visor', 'A cream band with a blue visor.', ['#f4f1ea', '#2f5bd3'], 'visor'],
    ['hat.halo', 'Halo', 'A golden ring that floats.', ['#f2c230'], 'halo'],
    ['hat.antlers', 'Antlers', 'A pair of small antlers.', ['#a9773f'], 'antlers', 1],
    ['hat.crown', 'Crown', 'A small golden crown.', ['#e1b84a', '#9e2f2a'], 'crown'],
    ['pet.fox', 'Fox', 'A small fox that rides on your shoulder.', ['#e07a3a', '#f4efe6', '#3a2a22'], 'fox'],
    ['pet.owl', 'Owl', 'A round owl that rides on your shoulder.', ['#9b7b5b', '#efe3cf', '#3a2a22'], 'owl'],
    ['pet.cat', 'Cat', 'A grey cat that rides on your shoulder.', ['#5b5f66', '#e9e4da', '#26262c'], 'cat'],
    ['pet.frog', 'Frog', 'A green frog that rides on your shoulder.', ['#79a85a', '#d9e8b8', '#26262c'], 'frog'],
    ['pet.bunny', 'Bunny', 'A white bunny that rides on your shoulder.', ['#e9e4da', '#e8b7b0', '#26262c'], 'bunny'],
    ['pet.crow', 'Crow', 'A black crow that rides on your shoulder.', ['#2a2a31', '#4b4b57', '#e1b84a'], 'crow', 1],
    ['emote.wave', 'Wave', 'Wave hello.', [], ''],
    ['emote.dance', 'Dance', 'A short dance.', [], ''],
    ['emote.sit', 'Sit', 'Sit down where you stand.', [], ''],
    ['emote.point', 'Point', 'Point at something.', [], ''],
    ['emote.clap', 'Clap', 'Clap for your friends.', [], ''],
    ['emote.bow', 'Bow', 'Take a bow.', [], ''],
    ['emote.facepalm', 'Facepalm', 'For when it goes wrong.', [], ''],
    ['emote.gg', 'GG', 'Good game.', [], ''],
  ];
  const CATALOG = ROWS.map(([id, name, about, colors, motif, fresh]) => ({
    id, name, about, colors, motif, kind: id.split('.')[0], new: Boolean(fresh),
  }));
  const ITEM = Object.fromEntries(CATALOG.map((i) => [i.id, i]));

  // Squad emblems, on a 24-unit grid. `s` marks the ones drawn as strokes.
  const EMBLEMS = {
    wolf: { d: 'M3.5 2.5 9 8h6l5.5-5.5V12L16 17.5 12 21.5l-4-4L3.5 12Z M7.2 10.6l3.6 1.6-3 1.4Z M16.8 10.6l-3.6 1.6 3 1.4Z M10.6 16.6h2.8L12 18.2Z' },
    crown: { d: 'M3 17.5V7l5 4.5L12 4l4 7.5L21 7v10.5Z M3 19h18v2.5H3Z' },
    flame: { d: 'M12 2c1 4 6 6.4 6 12.2A6 6 0 0 1 6 14.2c0-3.4 2-5 2.4-8 1.5 1.6 2 3.2 2.1 4.7C11.6 8.6 12.4 5.6 12 2Z M12 12.6c.6 1.7 2.3 2.6 2.3 4.6a2.3 2.3 0 0 1-4.6 0c0-1.9 1.9-2.6 2.3-4.6Z' },
    star: { d: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z' },
    moon: { d: 'M15.5 3.2A9 9 0 1 0 21 15.6 7.2 7.2 0 0 1 15.5 3.2Z' },
    bolt: { d: 'M13.5 2 4.5 13.5h6.4L9.5 22l10-12.5h-6.6Z' },
    leaf: { d: 'M20.5 3.5C10 3.5 3.5 9.5 3.5 18v2.5H6c8.5 0 14.5-6.5 14.5-17Z' },
    mountain: { d: 'M1.5 20.5 9 7l4 6.8L16 9l6.5 11.5Z M7.6 9.6 9 7l1.5 2.6-1.5 1Z' },
    anchor: { s: 'M12 7v14M7.5 10.5h9M4 13.5c0 4.5 4 7.5 8 7.5s8-3 8-7.5M12 3a2 2 0 1 0 .01 0' },
    wave: { s: 'M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 4-2 5-1M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 4-2 5-1' },
    key: { s: 'M8 8.5a4 4 0 1 0 .01 0M11 11.5l9 9M16 16.5l2.5-2.5M18.5 19l2-2' },
    heart: { d: 'M12 21 3.8 12.8a4.9 4.9 0 0 1 8.2-5.6 4.9 4.9 0 0 1 8.2 5.6Z' },
  };

  // Math ----------------------------------------------------------------------
  const RAD = Math.PI / 180;
  // Rotate p by r = [rx, ry, rz] degrees: z first, then x, then y.
  function rot(p, r) {
    let [x, y, z] = p;
    if (r[2]) { const c = Math.cos(r[2] * RAD), s = Math.sin(r[2] * RAD); [x, y] = [x * c - y * s, x * s + y * c]; }
    if (r[0]) { const c = Math.cos(r[0] * RAD), s = Math.sin(r[0] * RAD); [y, z] = [y * c - z * s, y * s + z * c]; }
    if (r[1]) { const c = Math.cos(r[1] * RAD), s = Math.sin(r[1] * RAD); [x, z] = [x * c + z * s, -x * s + z * c]; }
    return [x, y, z];
  }
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // A soft key light from the upper left, in front.
  const KEY = norm([-0.55, 0.7, 0.65]);

  // Pixels --------------------------------------------------------------------
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  // Stable noise in [0, 1).
  function hash(x, y, s = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const hex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (c, k) => hex(rgb(c).map((v) => v * k));
  const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

  // Snaps a small drawing to a palette, so every pixel is a palette colour.
  // With `dither`, colours between two entries become an ordered pattern.
  function quantize(c, palette, dither = false) {
    const g = c.getContext('2d');
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const pal = palette.map(rgb);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      if (d[i + 3] < 128) { d[i + 3] = 0; continue; }
      d[i + 3] = 255;
      let a = 0, b = -1, da = Infinity, db = Infinity;
      for (let k = 0; k < pal.length; k++) {
        const q = pal[k];
        const dd = (q[0] - d[i]) ** 2 * 0.3 + (q[1] - d[i + 1]) ** 2 * 0.59 + (q[2] - d[i + 2]) ** 2 * 0.11;
        if (dd < da) { b = a; db = da; a = k; da = dd; } else if (dd < db) { b = k; db = dd; }
      }
      let pick = a;
      if (dither && b >= 0 && db < Infinity) {
        const t = Math.sqrt(da) / (Math.sqrt(da) + Math.sqrt(db));
        if (t > BAYER[((((p / c.width) | 0) & 3) << 2) | ((p % c.width) & 3)]) pick = b;
      }
      d[i] = pal[pick][0]; d[i + 1] = pal[pick][1]; d[i + 2] = pal[pick][2];
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // Drawing helpers on a small canvas.
  const D = {
    fill(g, c) { g.fillStyle = c; g.fillRect(0, 0, g.canvas.width, g.canvas.height); },
    vgrad(g, stops, y0 = 0, y1 = g.canvas.height) {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      stops.forEach(([t, c]) => gr.addColorStop(t, c));
      g.fillStyle = gr; g.fillRect(0, y0, g.canvas.width, y1 - y0);
    },
    glow(g, x, y, r, color, a = 0.7) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const [cr, cg, cb] = rgb(color);
      gr.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`); gr.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    },
    poly(g, pts, c) { g.fillStyle = c; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill(); },
    circ(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); },
    ell(g, x, y, rx, ry, a, c) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, Math.PI * 2); g.fill(); },
    px(g, x, y, c, w = 1, h = 1) { g.fillStyle = c; g.fillRect(x, y, w, h); },
    line(g, pts, c, w = 1) { g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); },
  };

  // Capes: 40 × 64 pixel faces ---------------------------------------------------
  const FW = 40, FH = 64;
  // Each motif: its palette, whether gradients are dithered, and how it's drawn.
  const CAPES = {
    flame: {
      pal: ['#24060a', '#3a0b0e', '#521214', '#6e1a16', '#9a2a18', '#d24c1e', '#ff8a33', '#ffd36b', '#fff4cf'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#5c1416'], [1, '#33090c']]);
        D.glow(g, 20, 31, 21, '#d24c1e', 0.75);
        D.glow(g, 20, 33, 11, '#ff8a33', 0.6);
        g.fillStyle = '#ff8a33'; g.fill(new Path2D('M20 13C24.5 19 30.5 23.5 30.5 32.5C30.5 39 25.8 44 20 44C14.2 44 9.5 39 9.5 33C9.5 27.5 12.8 25.5 14.2 21C16 24 17 26.5 17.8 28.5C18.6 24 18.4 18.5 20 13Z'));
        g.fillStyle = '#ffd36b'; g.fill(new Path2D('M20 23C23 27.5 26.4 30 26.4 35C26.4 39 23.5 41.6 20 41.6C16.5 41.6 13.6 39 13.6 35.4C13.6 32.4 15.6 30.6 16.8 28C17.8 30 18.8 31.2 19.4 32C19.8 29 19.5 26 20 23Z'));
        D.ell(g, 20, 37.4, 3.2, 3.8, 0, '#fff4cf');
        [[12, 12, '#ffd36b'], [28, 9, '#ff8a33'], [25, 5, '#ffd36b'], [9, 20, '#d24c1e'], [31, 16, '#ffd36b']].forEach(([x, y, c]) => D.px(g, x, y, c));
        D.px(g, 0, 56, '#d24c1e', FW, 1); D.px(g, 0, 57, '#24060a', FW, 7);
        D.px(g, 0, 0, '#24060a', 1, FH); D.px(g, FW - 1, 0, '#24060a', 1, FH);
      },
    },
    waves: {
      pal: ['#0a2733', '#0e3a4a', '#145b6e', '#1f7f8e', '#3fb0b0', '#9fe0dc', '#e9fbf8'], dither: false,
      draw(g) {
        D.vgrad(g, [[0, '#0a2733'], [1, '#0e3a4a']]);
        D.circ(g, 30, 8, 3.6, '#e9fbf8');
        const layers = ['#0e3a4a', '#145b6e', '#1f7f8e', '#145b6e', '#3fb0b0', '#1f7f8e'];
        layers.forEach((col, k) => {
          const y0 = 18 + k * 8;
          const yAt = (x) => y0 + Math.sin((x + k * 9) / 40 * Math.PI * 3) * 2.6;
          g.fillStyle = col; g.beginPath(); g.moveTo(0, FH);
          for (let x = 0; x <= FW; x++) g.lineTo(x, yAt(x));
          g.lineTo(FW, FH); g.fill();
          for (let x = 0; x < FW; x++) {
            const y = Math.round(yAt(x + 0.5));
            D.px(g, x, y, k % 2 ? '#9fe0dc' : '#e9fbf8');
            if (Math.sin((x + k * 9 + 2) / 40 * Math.PI * 3) > 0.9) D.px(g, x, y - 1, '#e9fbf8');
          }
        });
      },
    },
    leaves: {
      pal: ['#1a2b14', '#243a1c', '#2f4a25', '#3f6330', '#5d8a3f', '#8ab65a', '#c7e08a', '#f2e3a0', '#e9a6b8'], dither: false,
      draw(g) {
        D.fill(g, '#2f4a25');
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const h = hash(x, y, 3); if (h > 0.88) D.px(g, x, y, '#243a1c'); else if (h < 0.04) D.px(g, x, y, '#3f6330'); }
        // A pixel leaf, 4 wide and 3 tall, pointing left or right.
        const leaf = (x, y, dir) => {
          const at = (dx, dy, c) => D.px(g, dir > 0 ? x + dx : x + 3 - dx, y + dy, c);
          at(1, 0, '#c7e08a'); at(2, 0, '#8ab65a');
          at(0, 1, '#8ab65a'); at(1, 1, '#8ab65a'); at(2, 1, '#8ab65a'); at(3, 1, '#5d8a3f');
          at(1, 2, '#5d8a3f'); at(2, 2, '#3f6330');
        };
        const vine = (x0, top, side) => {
          for (let y = 63; y > top; y--) D.px(g, x0 + Math.round(Math.sin(y / 5) * 1.2), y, '#5d8a3f');
          for (let y = 60, k = 0; y > top + 2; y -= 4, k++) {
            const x = x0 + Math.round(Math.sin(y / 5) * 1.2);
            leaf(k % 2 ? x + 1 : x - 4, y - 1, k % 2 ? 1 : -1);
          }
          D.px(g, x0, top, '#c7e08a');
        };
        vine(3, 10, 1); vine(36, 18, -1);
        for (let x = -2, k = 0; x < FW; x += 3, k++) leaf(x, 57 + (k % 3), k % 2 ? 1 : -1);
        for (let x = 0, k = 0; x < FW; x += 4, k++) leaf(x + 1, 61 - (k % 2), k % 2 ? -1 : 1);
        [[6, 40, '#f2e3a0'], [33, 34, '#e9a6b8'], [14, 55, '#f2e3a0'], [27, 56, '#e9a6b8'], [7, 22, '#e9a6b8'], [34, 50, '#f2e3a0']].forEach(([x, y, c]) => {
          D.px(g, x, y - 1, c); D.px(g, x - 1, y, c); D.px(g, x + 1, y, c); D.px(g, x, y + 1, c); D.px(g, x, y, '#f2e3a0');
        });
      },
    },
    noise: {
      pal: ['#121316', '#26282c', '#3e4045', '#5e6166', '#86898e', '#b0b3b8', '#d8dadd', '#f4f5f6'], dither: false,
      draw(g) {
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
          let v = hash(x, y, 11) * 0.8 + 0.08;
          if (y >= 22 && y <= 27) v += 0.32 - Math.abs(y - 24.5) * 0.05;
          if (y >= 44 && y <= 45) v -= 0.25;
          if (y % 2) v *= 0.82;
          const c = Math.max(0, Math.min(255, v * 255));
          D.px(g, x, y, `rgb(${c},${c},${c})`);
        }
        D.px(g, 0, 0, '#121316', FW, 1); D.px(g, 0, FH - 1, '#121316', FW, 1);
        D.px(g, 0, 0, '#121316', 1, FH); D.px(g, FW - 1, 0, '#121316', 1, FH);
      },
    },
    aurora: {
      pal: ['#0a0f24', '#111838', '#1b2550', '#17605e', '#2fb3a0', '#3fd29a', '#9ff0c8', '#4b3f98', '#8e7bf0', '#d4b8fb', '#ffffff'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#0a0f24'], [1, '#1b2550']]);
        const band = (x, col, a, w) => {
          const gr = g.createLinearGradient(0, 4, 0, 52);
          const [r, gg, b] = rgb(col);
          gr.addColorStop(0, `rgba(${r},${gg},${b},0)`); gr.addColorStop(0.45, `rgba(${r},${gg},${b},${a})`); gr.addColorStop(1, `rgba(${r},${gg},${b},0)`);
          g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, 4);
          g.bezierCurveTo(x + 6, 18, x - 7, 34, x + 3, 52); g.lineTo(x + 3 + w, 52); g.bezierCurveTo(x - 7 + w, 34, x + 6 + w, 18, x, 4); g.fill();
        };
        band(7, '#3fd29a', 0.95, 7); band(17, '#8e7bf0', 0.85, 6); band(25, '#3fd29a', 0.9, 8); band(34, '#8e7bf0', 0.8, 6); band(14, '#9ff0c8', 0.6, 3); band(30, '#d4b8fb', 0.5, 3);
        [[4, 3], [12, 9], [21, 2], [33, 6], [37, 13], [8, 47], [27, 45], [18, 55]].forEach(([x, y]) => D.px(g, x, y, '#ffffff'));
        D.poly(g, [[0, 64], [0, 58], [7, 55], [13, 58], [21, 53], [29, 57], [35, 54], [40, 57], [40, 64]], '#0a0f24');
      },
    },
    splash: {
      pal: ['#f4efe2', '#e2d8c2', '#1a1a22', '#3a3a4e'], dither: false,
      draw(g) {
        D.fill(g, '#f4efe2');
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (hash(x, y, 21) > 0.93) D.px(g, x, y, '#e2d8c2');
        const ink = '#1a1a22';
        D.circ(g, 20, 28, 8.5, ink); D.circ(g, 15, 24, 5, ink); D.circ(g, 25, 33, 5.5, ink); D.circ(g, 24, 22, 4, ink);
        for (let i = 0; i < 13; i++) {
          const a = i / 13 * Math.PI * 2 + hash(i, 1) * 0.4, len = 12 + hash(i, 2) * 7;
          const ex = 20 + Math.cos(a) * len, ey = 28 + Math.sin(a) * len * 1.15;
          D.line(g, [[20 + Math.cos(a) * 7, 28 + Math.sin(a) * 7], [ex, ey]], ink, 1.6 - hash(i, 3) * 0.6);
          D.circ(g, ex, ey, 1 + hash(i, 4) * 1.1, ink);
        }
        [[6, 9, 1.2], [34, 12, 1], [5, 46, 1.4], [35, 47, 1.1], [30, 5, 0.9], [11, 54, 0.9]].forEach(([x, y, r]) => D.circ(g, x, y, r, ink));
        [[17, 36, 18], [23, 38, 12], [27, 36, 22]].forEach(([x, y, len]) => { D.px(g, x - 1, y, ink, 2, len); D.circ(g, x, y + len, 1.4, ink); });
        D.px(g, 16, 23, '#3a3a4e', 2, 1); D.px(g, 15, 24, '#3a3a4e', 1, 2);
      },
    },
    comet: {
      pal: ['#0b1028', '#121a3a', '#1c2752', '#2a3a6e', '#5a3f7a', '#b4566e', '#f08a5a', '#ffc46b', '#ffe9a8', '#ffffff'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#0b1028'], [1, '#22305e']]);
        for (let i = 0; i < 6; i++) {
          const w = 7 - i, a = 0.9 - i * 0.12;
          const gr = g.createLinearGradient(31, 12, 5, 56);
          gr.addColorStop(0, `rgba(255,233,168,${a})`); gr.addColorStop(0.35, `rgba(240,138,90,${a * 0.9})`); gr.addColorStop(0.7, `rgba(180,86,110,${a * 0.6})`); gr.addColorStop(1, 'rgba(90,63,122,0)');
          g.strokeStyle = gr; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(31, 12); g.quadraticCurveTo(16, 30, 5 + i, 58); g.stroke();
        }
        D.glow(g, 31, 12, 9, '#ffe9a8', 0.8);
        D.circ(g, 31, 12, 3.2, '#ffffff');
        [[6, 6], [14, 3], [37, 28], [24, 50], [35, 44], [10, 30], [19, 14], [3, 20], [32, 58]].forEach(([x, y], i) => D.px(g, x, y, i % 3 ? '#ffe9a8' : '#ffffff'));
      },
    },
    lantern: {
      pal: ['#1e0b0d', '#2a1012', '#3e1616', '#5e2018', '#8a2e1a', '#c2491f', '#f08a2a', '#ffc65a', '#fff0b8'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#2a1012'], [1, '#1e0b0d']]);
        D.glow(g, 20, 31, 24, '#f08a2a', 0.65);
        D.px(g, 19.5, 0, '#5e2018', 1, 16);
        D.px(g, 15, 15, '#3e1616', 10, 3);
        const gr = g.createRadialGradient(20, 30, 1, 20, 31, 12);
        gr.addColorStop(0, '#fff0b8'); gr.addColorStop(0.45, '#ffc65a'); gr.addColorStop(0.8, '#f08a2a'); gr.addColorStop(1, '#c2491f');
        g.fillStyle = gr; g.beginPath(); g.ellipse(20, 31, 10, 13, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#c2491f'; g.lineWidth = 1;
        for (const k of [-0.62, -0.25, 0.25, 0.62]) { g.beginPath(); g.ellipse(20, 31, Math.abs(k) * 10, 13, 0, 0, Math.PI * 2); g.stroke(); }
        D.px(g, 15, 43, '#3e1616', 10, 3);
        D.line(g, [[20, 46], [20, 55]], '#c2491f', 1); D.line(g, [[19, 47], [17, 54]], '#8a2e1a', 1); D.line(g, [[21, 47], [23, 54]], '#8a2e1a', 1);
        [[7, 10], [33, 18], [6, 50], [34, 54], [29, 6]].forEach(([x, y]) => D.px(g, x, y, '#ffc65a'));
      },
    },
    facets: {
      pal: ['#ffffff', '#e9f6fb', '#cfe8f3', '#a8d3e8', '#79b6d6', '#4f8fbf', '#2f6a9a'], dither: false,
      draw(g) {
        const cols = 5, rows = 8, P = [];
        for (let r = 0; r <= rows; r++) {
          P.push([]);
          for (let c = 0; c <= cols; c++) {
            const edge = c === 0 || c === cols || r === 0 || r === rows;
            P[r].push([c * 8 + (edge ? 0 : (hash(c, r, 31) - 0.5) * 6), r * 8 + (edge ? 0 : (hash(c, r, 32) - 0.5) * 6)]);
          }
        }
        const shades = ['#e9f6fb', '#cfe8f3', '#a8d3e8', '#79b6d6', '#4f8fbf', '#2f6a9a'];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const [a, b, cc, d] = [P[r][c], P[r][c + 1], P[r + 1][c + 1], P[r + 1][c]];
          const flip = hash(c, r, 33) > 0.5;
          const tris = flip ? [[a, b, cc], [a, cc, d]] : [[a, b, d], [b, cc, d]];
          tris.forEach((t, k) => {
            const lv = Math.min(5, Math.max(0, Math.floor(r / rows * 3.2 + hash(c * 2 + k, r, 34) * 2.6)));
            D.poly(g, t, shades[lv]);
          });
        }
        for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) if (hash(c, r, 35) > 0.6) D.line(g, [P[r][c], P[r][c + 1]], '#ffffff', 1);
      },
    },
    dunes: {
      pal: ['#fff4d6', '#ffe1a8', '#f6c27a', '#e9a65a', '#d98a45', '#b86b35', '#8f5a2c'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#fff4d6'], [1, '#f6c27a']], 0, 30);
        D.circ(g, 27, 19, 6, '#fff4d6'); D.glow(g, 27, 19, 12, '#ffe1a8', 0.6);
        const cols = ['#e9a65a', '#d98a45', '#b86b35', '#8f5a2c'];
        cols.forEach((col, k) => {
          const y0 = 26 + k * 10, amp = 4 - k * 0.5, ph = k * 1.7;
          const yAt = (x) => y0 + Math.sin(x / 40 * Math.PI * 1.4 + ph) * amp;
          g.fillStyle = col; g.beginPath(); g.moveTo(0, FH); for (let x = 0; x <= FW; x++) g.lineTo(x, yAt(x)); g.lineTo(FW, FH); g.fill();
          for (let x = 0; x < FW; x++) D.px(g, x, Math.round(yAt(x + 0.5)), k ? cols[k - 1] : '#f6c27a');
        });
      },
    },
    thistle: {
      pal: ['#241a30', '#3b2a4a', '#5a3f70', '#7d55a0', '#a77bd0', '#d3b4ef', '#4f7a45', '#7fa36b', '#b9d39a'], dither: false,
      draw(g) {
        D.vgrad(g, [[0, '#3b2a4a'], [1, '#241a30']]);
        for (let x = 0; x < FW; x += 4) { D.px(g, x, 3, '#5a3f70', 2, 1); D.px(g, x + 2, 2, '#5a3f70', 2, 1); }
        D.line(g, [[20, 63], [21, 50], [20, 34]], '#4f7a45', 2);
        D.poly(g, [[20, 52], [9, 44], [13, 47], [7, 48], [14, 51], [10, 54]], '#7fa36b');
        D.poly(g, [[21, 46], [32, 39], [28, 42], [34, 43], [27, 46], [31, 49]], '#7fa36b');
        D.ell(g, 20, 31, 6, 5, 0, '#7fa36b');
        for (let y = 27; y < 36; y += 2) for (let x = 15; x < 26; x += 2) D.px(g, x + (y % 4 ? 1 : 0), y, '#4f7a45');
        D.px(g, 17, 28, '#b9d39a');
        for (let i = 0; i < 11; i++) {
          const a = -Math.PI / 2 + (i - 5) * 0.2, len = 9 + hash(i, 8) * 4;
          D.line(g, [[20, 27], [20 + Math.cos(a) * len, 27 + Math.sin(a) * len]], i % 2 ? '#7d55a0' : '#a77bd0', 1);
          D.px(g, Math.round(20 + Math.cos(a) * len), Math.round(27 + Math.sin(a) * len), '#d3b4ef');
        }
      },
    },
    stripes: {
      pal: ['#16253d', '#22385a', '#f1e9d6', '#d9cfb8', '#c98b4a', '#8f5a2c', '#b8322a'], dither: false,
      draw(g) {
        D.fill(g, '#f1e9d6');
        for (let y = 2; y < 52; y += 8) D.px(g, 0, y, '#22385a', FW, 4);
        D.circ(g, 20, 24, 7.5, '#f1e9d6');
        g.strokeStyle = '#b8322a'; g.lineWidth = 1.6; g.lineCap = 'round';
        g.stroke(new Path2D('M20 19v11M16.5 21.5h7M15 26.5c0 3 2.4 4.8 5 4.8s5-1.8 5-4.8M20 16.5a1.4 1.4 0 1 0 .01 0'));
        for (let x = 0; x < FW; x++) { D.px(g, x, 53 + (x % 4 < 2 ? 0 : 1), '#c98b4a', 1, 3); D.px(g, x, 53 + (x % 4 < 2 ? 3 : 0), '#8f5a2c'); }
        D.px(g, 0, 57, '#16253d', FW, 7);
      },
    },
    pines: {
      pal: ['#0b1422', '#16263a', '#1f3550', '#234a33', '#2f5a3e', '#3f7350', '#c9d6e0', '#eef2f4'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#0b1422'], [1, '#26405e']], 0, 52);
        D.circ(g, 30, 10, 4.5, '#eef2f4'); D.circ(g, 32, 9, 3.6, '#16263a'); D.glow(g, 29, 10, 10, '#c9d6e0', 0.25);
        [[6, 4], [14, 8], [22, 3], [37, 20], [9, 17], [18, 14]].forEach(([x, y]) => D.px(g, x, y, '#eef2f4'));
        const tree = (x, h) => {
          for (let i = 0; i < 4; i++) {
            const top = 52 - h + i * h * 0.22, w = 3 + i * 2.2;
            D.poly(g, [[x, top], [x + w, top + h * 0.3], [x - w, top + h * 0.3]], '#2f5a3e');
            D.poly(g, [[x, top], [x - w, top + h * 0.3], [x - w * 0.4, top + h * 0.3]], '#3f7350');
            D.poly(g, [[x, top], [x + w * 0.45, top + 2.2], [x - w * 0.45, top + 2.2]], '#eef2f4');
          }
          D.px(g, x - 1, 52 - h * 0.1, '#234a33', 2, h * 0.12);
        };
        tree(10, 26); tree(31, 22); tree(21, 33);
        D.vgrad(g, [[0, '#eef2f4'], [1, '#c9d6e0']], 52, 64);
        for (let x = 0; x < FW; x++) D.px(g, x, 52 + Math.round(Math.sin(x / 6) * 0.8), '#eef2f4');
      },
    },
    quartz: {
      pal: ['#f3e3ea', '#e8c9d8', '#d39abb', '#b8749b', '#8f5277', '#5e3550', '#ffffff'], dither: false,
      draw(g) {
        D.fill(g, '#f3e3ea');
        for (let y = 0; y < FH; y += 1) for (let x = 0; x < FW; x++) if ((x + y) % 7 === 0 && hash(x, y, 41) > 0.5) D.px(g, x, y, '#e8c9d8');
        const crystal = (x, y, w, h, a) => {
          g.save(); g.translate(x, y); g.rotate(a);
          D.poly(g, [[-w, 0], [-w, -h], [0, -h - w * 1.4], [0, 0]], '#e8c9d8');
          D.poly(g, [[0, 0], [0, -h - w * 1.4], [w, -h], [w, 0]], '#b8749b');
          D.poly(g, [[-w, -h], [0, -h - w * 1.4], [0, -h + 1]], '#ffffff');
          D.poly(g, [[0, -h - w * 1.4], [w, -h], [0, -h + 1]], '#d39abb');
          g.restore();
        };
        crystal(11, 58, 3, 16, -0.35); crystal(29, 58, 3, 18, 0.32); crystal(16, 60, 4, 26, -0.12); crystal(24, 60, 4, 30, 0.08); crystal(20, 62, 3, 12, 0);
        D.poly(g, [[0, 64], [3, 58], [10, 56], [20, 59], [30, 56], [37, 58], [40, 64]], '#8f5277');
        D.poly(g, [[0, 64], [6, 61], [20, 62], [34, 61], [40, 64]], '#5e3550');
      },
    },
    border: {
      pal: ['#1c130f', '#241914', '#33241f', '#47332b', '#8a5a3a', '#c08a5b', '#e9c18f'], dither: false,
      draw(g) {
        D.fill(g, '#33241f');
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const h = hash(x, y, 51); if (h > 0.9) D.px(g, x, y, '#47332b'); else if (h < 0.06) D.px(g, x, y, '#241914'); }
        g.strokeStyle = '#c08a5b'; g.lineWidth = 2; g.strokeRect(3, 3, 34, 58);
        g.strokeStyle = '#e9c18f'; g.lineWidth = 1; g.strokeRect(6.5, 6.5, 27, 51);
        [[2, 2], [36, 2], [2, 60], [36, 60]].forEach(([x, y]) => D.px(g, x, y, '#e9c18f', 2, 2));
        D.poly(g, [[20, 15], [29, 29], [20, 43], [11, 29]], '#c08a5b');
        D.poly(g, [[20, 18], [26.5, 29], [20, 40], [13.5, 29]], '#8a5a3a');
        D.poly(g, [[20, 18], [13.5, 29], [20, 29]], '#e9c18f');
        D.px(g, 0, 0, '#1c130f', 1, FH); D.px(g, FW - 1, 0, '#1c130f', 1, FH);
      },
    },
    sunburst: {
      pal: ['#6e2e0c', '#8a3d12', '#b85a1a', '#e08a25', '#f0a92c', '#ffd76a', '#fff1c2'], dither: false,
      draw(g) {
        D.fill(g, '#f0a92c');
        for (let i = 0; i < 16; i++) {
          const a0 = Math.PI + i / 16 * Math.PI, a1 = Math.PI + (i + 0.5) / 16 * Math.PI;
          D.poly(g, [[20, 58], [20 + Math.cos(a0) * 80, 58 + Math.sin(a0) * 80], [20 + Math.cos(a1) * 80, 58 + Math.sin(a1) * 80]], '#ffd76a');
        }
        D.circ(g, 20, 60, 13, '#b85a1a'); D.circ(g, 20, 60, 10.5, '#8a3d12');
        for (let i = 0; i < 12; i++) { const a = Math.PI + (i + 0.5) / 12 * Math.PI; D.px(g, Math.round(20 + Math.cos(a) * 8), Math.round(60 + Math.sin(a) * 8), '#e08a25'); }
        D.px(g, 0, 0, '#b85a1a', FW, 1);
      },
    },
    snow: {
      pal: ['#141d36', '#1e2a48', '#2b3b62', '#4a5f8f', '#9fb4d8', '#ffffff'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#141d36'], [1, '#33477a']]);
        for (let i = 0; i < 46; i++) {
          const x = Math.floor(hash(i, 1, 61) * FW), y = Math.floor(hash(i, 2, 61) * 54);
          D.px(g, x, y, i % 4 ? '#9fb4d8' : '#ffffff');
        }
        [[8, 10], [29, 6], [17, 25], [34, 33], [6, 38], [24, 44]].forEach(([x, y]) => { D.px(g, x - 1, y, '#9fb4d8', 3, 1); D.px(g, x, y - 1, '#9fb4d8', 1, 3); D.px(g, x, y, '#ffffff'); });
        const drift = (y0, c, ph) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, FH); for (let x = 0; x <= FW; x++) g.lineTo(x, y0 + Math.sin(x / 7 + ph) * 1.6); g.lineTo(FW, FH); g.fill(); };
        drift(53, '#9fb4d8', 0); drift(57, '#ffffff', 2);
      },
    },
    sparks: {
      pal: ['#100f12', '#1e1d20', '#2c2a2f', '#3f3b40', '#5a2216', '#a8381a', '#e4672e', '#ffb04a', '#ffd36b'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#2c2a2f'], [1, '#100f12']]);
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (hash(x, y, 71) > 0.92) D.px(g, x, y, '#3f3b40');
        D.glow(g, 20, 70, 26, '#e4672e', 0.85);
        let x = 0, y = 59;
        g.strokeStyle = '#ffb04a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 59);
        while (x < FW) { x += 3 + hash(x, 1, 72) * 3; y = 57 + hash(x, 2, 72) * 5; g.lineTo(x, y); }
        g.stroke();
        for (let i = 0; i < 22; i++) {
          const sx = 2 + hash(i, 3, 73) * 36, sy = 8 + hash(i, 4, 73) * 48;
          const hot = sy > 40 ? '#ffd36b' : sy > 22 ? '#ffb04a' : '#e4672e';
          D.px(g, sx | 0, sy | 0, hot);
          if (i % 3 === 0) D.px(g, sx | 0, (sy | 0) + 1, '#a8381a');
        }
      },
    },
    fern: {
      pal: ['#eef5e2', '#d8e8c0', '#bcd49c', '#8ab65a', '#5d8a3f', '#3f7a35', '#2a5426'], dither: false,
      draw(g) {
        D.vgrad(g, [[0, '#eef5e2'], [1, '#d8e8c0']]);
        const frond = (x0, top, bend, stem, leafC, hiC, scale) => {
          const at = (t) => [x0 + Math.sin(t * 2.2) * bend * t, 63 - t * (63 - top)];
          const pts = []; for (let t = 0; t <= 1.001; t += 0.05) pts.push(at(t));
          D.line(g, pts, stem, 1.4);
          for (let i = 1; i < 16; i++) {
            const t = i / 16, [x, y] = at(t), len = (8.5 - t * 6) * scale;
            for (const s of [-1, 1]) {
              D.ell(g, x + s * len / 2, y - 1, len / 2, 1.3, s * -0.5, leafC);
              D.px(g, Math.round(x + s * len * 0.35), Math.round(y - 2), hiC);
            }
          }
        };
        frond(10, 20, 3, '#bcd49c', '#bcd49c', '#d8e8c0', 0.7);
        frond(22, 4, -5, '#2a5426', '#5d8a3f', '#8ab65a', 1);
      },
    },
    tiles: {
      pal: ['#1d242b', '#2f3842', '#3d4855', '#4b5866', '#5f6e7e', '#7d8c9c', '#9fb0c0'], dither: false,
      draw(g) {
        D.fill(g, '#2f3842');
        const tints = ['#4b5866', '#5f6e7e', '#3d4855', '#4b5866'];
        for (let r = -1, y = -2; y < FH; r++, y += 6) for (let x = r % 2 ? -4 : 0; x < FW; x += 8) {
          const c = tints[Math.floor(hash(x, y, 81) * 4)];
          g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y); g.lineTo(x + 8, y + 5); g.quadraticCurveTo(x + 4, y + 9, x, y + 5); g.fill();
          D.px(g, x + 1, y + 1, '#7d8c9c', 5, 1);
          g.strokeStyle = '#1d242b'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 8, y + 5.5); g.quadraticCurveTo(x + 4, y + 9.5, x, y + 5.5); g.stroke();
        }
      },
    },
    coral: {
      pal: ['#0a3034', '#0f474c', '#14595e', '#1f7a7a', '#3a9e98', '#bff0ea', '#c4504a', '#ef7d6b', '#f7a58f'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#2a8c88'], [0.6, '#14595e'], [1, '#0a3034']]);
        g.fillStyle = 'rgba(191,240,234,0.18)';
        [[4, 10], [16, 8], [28, 9]].forEach(([x, w]) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + w, 0); g.lineTo(x + w - 8, 40); g.lineTo(x - 8, 40); g.fill(); });
        const branch = (x, y, a, len, w, depth) => {
          const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
          D.line(g, [[x, y], [ex, ey]], depth % 2 ? '#ef7d6b' : '#f7a58f', w);
          if (depth > 0) { branch(ex, ey, a - 0.45, len * 0.72, Math.max(1, w - 0.6), depth - 1); branch(ex, ey, a + 0.42, len * 0.68, Math.max(1, w - 0.6), depth - 1); }
          else D.circ(g, ex, ey, 1, '#f7a58f');
        };
        branch(13, 64, -1.6, 11, 2.4, 3); branch(29, 64, -1.45, 13, 2.4, 3); branch(21, 64, -1.7, 8, 2, 2);
        D.poly(g, [[0, 64], [0, 61], [10, 60], [22, 62], [34, 60], [40, 61], [40, 64]], '#c4504a');
        [[8, 22, 1.5], [10, 15, 1], [31, 18, 1.4], [33, 10, 1], [22, 6, 1.2]].forEach(([x, y, r]) => { g.strokeStyle = '#bff0ea'; g.lineWidth = 0.9; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); });
      },
    },
    check: {
      pal: ['#a83a32', '#c9473d', '#e39a8f', '#f3e2c3', '#5d8a3f', '#7a3a2a', '#fff6e0'], dither: false,
      draw(g) {
        D.fill(g, '#f3e2c3');
        for (let x = 0; x < FW; x += 8) D.px(g, x, 0, '#e39a8f', 4, FH);
        for (let y = 0; y < FH; y += 8) D.px(g, 0, y, '#e39a8f', FW, 4);
        for (let x = 0; x < FW; x += 8) for (let y = 0; y < FH; y += 8) D.px(g, x, y, '#c9473d', 4, 4);
        D.circ(g, 20, 30, 10, '#fff6e0');
        for (let i = 0; i < 24; i++) if (i % 2 === 0) { const a = i / 24 * Math.PI * 2; D.px(g, Math.round(20 + Math.cos(a) * 9), Math.round(30 + Math.sin(a) * 9), '#a83a32'); }
        D.circ(g, 18, 32, 4.4, '#c9473d'); D.circ(g, 22, 32, 4.4, '#c9473d');
        D.px(g, 17, 30, '#e39a8f', 2, 1); D.px(g, 16, 31, '#e39a8f');
        D.px(g, 20, 25, '#7a3a2a', 1, 3); D.ell(g, 22.5, 25.5, 2.4, 1.1, -0.4, '#5d8a3f');
      },
    },
    clouds: {
      pal: ['#4f86c0', '#6fa3d8', '#8fbbe6', '#b8cde3', '#cfe3f5', '#ffffff'], dither: true,
      draw(g) {
        D.vgrad(g, [[0, '#4a80bc'], [1, '#a8cbee']]);
        const cloud = (x, y, k) => {
          [[-7, 1, 4], [-2, -2, 5.5], [4, -1, 4.5], [8, 2, 3]].forEach(([dx, dy, r]) => D.circ(g, x + dx * k, y + dy * k, r * k, '#ffffff'));
          D.px(g, x - 10 * k, y + 2 * k, '#ffffff', 21 * k, 3 * k);
          D.px(g, x - 10 * k, y + 4 * k, '#cfe3f5', 21 * k, 1.5 * k);
        };
        cloud(14, 14, 1); cloud(27, 34, 1.15); cloud(11, 52, 0.9);
      },
    },
    tape: {
      pal: ['#121110', '#1b1a17', '#2a2824', '#c99a1a', '#f2c230', '#f4f1ea'], dither: false,
      draw(g) {
        D.fill(g, '#1b1a17');
        for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if ((x + y * 2) % 6 === 0) D.px(g, x, y, '#2a2824');
        g.save(); g.translate(20, 34); g.rotate(-0.62);
        D.px(g, -40, -6, '#f2c230', 80, 12); D.px(g, -40, -6, '#c99a1a', 80, 1); D.px(g, -40, 5, '#c99a1a', 80, 1);
        for (let x = -40, i = 0; x < 40; x += 2, i++) D.px(g, x, -5, '#1b1a17', 1, i % 5 ? 2 : 4);
        g.restore();
        g.fillStyle = '#f2c230'; g.save(); g.translate(5, 5); g.scale(0.5, 0.5); g.fill(new Path2D(EMBLEMS.star.d)); g.restore();
        for (let x = 3; x < FW - 3; x += 3) D.px(g, x, 59, '#f4f1ea', 2, 1);
      },
    },
  };

  // 40 × 64 face for a catalog cape (what the cards show).
  const faces = new Map();
  function capeFace(id) {
    if (!faces.has(id)) {
      const spec = CAPES[ITEM[id].motif];
      const c = canvas(FW, FH);
      spec.draw(c.getContext('2d'));
      faces.set(id, quantize(c, spec.pal, spec.dither));
    }
    return faces.get(id);
  }

  // A face in Minecraft's 64 × 32 cape layout at `scale`: outer face at (1, 1),
  // inner face (the lining) at (12, 1), 1-pixel sides, top and bottom.
  function capeLayout(face, scale = 4, smooth = false) {
    const s = scale, c = canvas(64 * s, 32 * s), g = c.getContext('2d');
    g.imageSmoothingEnabled = smooth;
    g.drawImage(face, s, s, 10 * s, 16 * s);
    const pixels = face.getContext('2d').getImageData(0, 0, face.width, face.height).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < pixels.length; i += 16) if (pixels[i + 3] > 0) { r += pixels[i]; gg += pixels[i + 1]; b += pixels[i + 2]; n++; }
    const avg = hex([r / n, gg / n, b / n]);
    const lining = shade(avg, 0.62), edge = shade(avg, 0.5);
    g.fillStyle = lining; g.fillRect(12 * s, s, 10 * s, 16 * s);
    for (let y = 0; y < 16 * s; y++) for (let x = 0; x < 10 * s; x++) if (hash(x, y, 91) > 0.9) { g.fillStyle = shade(lining, 0.9); g.fillRect(12 * s + x, s + y, 1, 1); }
    g.fillStyle = edge;
    g.fillRect(0, s, s, 16 * s); g.fillRect(11 * s, s, s, 16 * s); g.fillRect(s, 0, 10 * s, s); g.fillRect(11 * s, 0, 10 * s, s);
    c.smooth = smooth;
    c.layoutScale = s;
    return c;
  }

  const layouts = new Map();
  function capeTexture(id) {
    if (!layouts.has(id)) layouts.set(id, capeLayout(capeFace(id)));
    return layouts.get(id);
  }
  // A squad cape: the main colour, the emblem and a band at the hem.
  function squadFace({ emblem, colors: [a, b] }) {
    const key = `squad:${emblem}:${a}:${b}`;
    if (!faces.has(key)) {
      const c = canvas(FW, FH), g = c.getContext('2d');
      D.fill(g, a);
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (hash(x, y, 95) > 0.9) D.px(g, x, y, shade(a, 0.86));
      D.px(g, 0, 0, shade(a, 0.7), 1, FH); D.px(g, FW - 1, 0, shade(a, 0.7), 1, FH);
      emblemPath(g, emblem, b, 8, 12, 24);
      D.px(g, 0, 50, b, FW, 3); D.px(g, 0, 55, b, FW, 1);
      faces.set(key, quantize(c, [a, shade(a, 0.86), shade(a, 0.7), b, shade(b, 0.8)]));
    }
    return faces.get(key);
  }
  function squadTexture(squad) {
    const key = `squad:${squad.emblem}:${squad.colors.join(':')}`;
    if (!layouts.has(key)) layouts.set(key, capeLayout(squadFace(squad)));
    return layouts.get(key);
  }
  // A custom cape: the cropped part of the player's picture, at 8x (80 × 128 a face).
  function customTexture(source, crop) {
    const f = canvas(80, 128), g = f.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, 80, 128);
    return capeLayout(f, 8, true);
  }
  function emblemPath(g, name, color, x, y, size) {
    const e = EMBLEMS[name];
    g.save(); g.translate(x, y); g.scale(size / 24, size / 24);
    g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round';
    if (e.d) g.fill(new Path2D(e.d), 'evenodd');
    if (e.s) g.stroke(new Path2D(e.s));
    g.restore();
  }

  // Wings: pixel art, the left wing on a 48 × 36 sprite with the root on the left.
  const wingSprites = new Map();
  function wingTexture(id) {
    if (wingSprites.has(id)) return wingSprites.get(id);
    const item = ITEM[id];
    const [a, b, c = '#ffffff'] = item.colors;
    const big = canvas(256, 192), g = big.getContext('2d');
    if (item.motif === 'moth') {
      g.fillStyle = a;
      g.beginPath(); g.moveTo(4, 70); g.bezierCurveTo(60, -10, 210, -16, 246, 40); g.bezierCurveTo(250, 86, 170, 104, 96, 104); g.bezierCurveTo(50, 104, 14, 94, 4, 70); g.fill();
      g.beginPath(); g.moveTo(6, 96); g.bezierCurveTo(70, 100, 170, 110, 180, 150); g.bezierCurveTo(176, 186, 92, 188, 50, 160); g.bezierCurveTo(24, 142, 8, 120, 6, 96); g.fill();
      g.fillStyle = mix(a, b, 0.35);
      g.beginPath(); g.moveTo(4, 70); g.bezierCurveTo(60, 30, 150, 30, 200, 60); g.bezierCurveTo(150, 80, 80, 90, 4, 80); g.fill();
      for (const [x, y, r] of [[176, 50, 22], [112, 146, 15]]) {
        g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
        g.fillStyle = b; g.beginPath(); g.arc(x, y, r * 0.55, 0, 7); g.fill();
      }
    } else if (item.motif === 'feather') {
      // A raised wing: rows of feathers under a curved leading edge, longest toward the tip.
      const shape = new Path2D('M4 120C40 70 140 20 252 6C244 60 200 120 120 176C80 196 30 186 10 160C2 148 0 134 4 120Z');
      g.fillStyle = a; g.fill(shape);
      g.save(); g.clip(shape);
      const rows = [[0.92, b], [0.66, mix(a, b, 0.45)], [0.4, b]];
      for (const [k, col] of rows) {
        g.strokeStyle = col; g.lineWidth = 7;
        for (let i = 0; i < 9; i++) {
          const t = i / 8;
          const x = 10 + t * 230, y = 150 - t * 140;
          const cx = x - 14 + (1 - k) * 20, cy = y + 60 * k + 10;
          g.beginPath(); g.arc(cx, cy, 16 * k + 8, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
        }
      }
      g.fillStyle = mix(a, '#ffffff', 0.18);
      g.beginPath(); g.moveTo(4, 120); g.bezierCurveTo(40, 70, 140, 20, 252, 6); g.bezierCurveTo(150, 40, 60, 90, 12, 132); g.closePath(); g.fill();
      g.restore();
    } else {
      g.fillStyle = a;
      g.beginPath(); g.ellipse(128, 56, 124, 30, -0.12, 0, 7); g.fill();
      g.beginPath(); g.ellipse(110, 128, 104, 24, 0.16, 0, 7); g.fill();
      g.fillStyle = b;
      g.beginPath(); g.ellipse(128, 56, 100, 18, -0.12, 0, 7); g.fill();
      g.beginPath(); g.ellipse(110, 128, 82, 13, 0.16, 0, 7); g.fill();
    }
    const W = 48, H = 36, t = canvas(W, H), tg = t.getContext('2d');
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(big, 0, 0, W, H);
    const outline = shade(item.motif === 'feather' ? b : a, 0.55);
    quantize(t, [a, b, c, mix(a, b, 0.35), mix(a, b, 0.45)]);
    // A one-pixel dark outline makes the sprite read at any size.
    const img = tg.getImageData(0, 0, W, H), d = img.data, o = rgb(outline);
    const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] > 0;
    const edges = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y) && (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1))) edges.push((y * W + x) * 4);
    for (const i of edges) { d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; }
    tg.putImageData(img, 0, 0);
    if (item.motif === 'sprite') t.alpha = 0.85;
    wingSprites.set(id, t);
    return t;
  }

  // Voxel textures for hats and pets: two pixels a unit, a little grain and a darker rim.
  const voxels = new Map();
  function voxel(color, w, h) {
    const W = Math.max(1, Math.round(w * 2)), H = Math.max(1, Math.round(h * 2));
    const key = `${color}:${W}:${H}`;
    if (!voxels.has(key)) {
      const c = canvas(W, H), g = c.getContext('2d');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const rim = x === 0 || y === 0 || x === W - 1 || y === H - 1;
        const k = (rim && W > 2 && H > 2 ? 0.9 : 1) * (0.96 + hash(x, y, W * 31 + H) * 0.08);
        g.fillStyle = shade(color, k); g.fillRect(x, y, 1, 1);
      }
      voxels.set(key, c);
    }
    return voxels.get(key);
  }

  // Skins ------------------------------------------------------------------------
  // Box UV in the 64 × 64 layout: [u, v, w, h, d] for each part and its outer layer.
  const SKIN_UV = {
    head: [0, 0, 8, 8, 8], hat: [32, 0, 8, 8, 8],
    body: [16, 16, 8, 12, 4], jacket: [16, 32, 8, 12, 4],
    armR: [40, 16, 4, 12, 4], sleeveR: [40, 32, 4, 12, 4],
    armL: [32, 48, 4, 12, 4], sleeveL: [48, 48, 4, 12, 4],
    legR: [0, 16, 4, 12, 4], pantsR: [0, 32, 4, 12, 4],
    legL: [16, 48, 4, 12, 4], pantsL: [0, 48, 4, 12, 4],
  };
  // Where each face of a box sits in its texture, by our face names (front faces +z;
  // `left` is the face at -x, the player's right side).
  function uvRects(u, v, w, h, d) {
    return {
      top: [u + d, v, w, d], bottom: [u + d + w, v, w, d],
      left: [u, v + d, d, h], front: [u + d, v + d, w, h],
      right: [u + d + w, v + d, d, h], back: [u + 2 * d + w, v + d, w, h],
    };
  }
  // Paint a skin with a few calls: fill(part, colour), rect(part, face, x, y, w, h, colour), px(...).
  function paintSkin(fn, slim = false) {
    const c = canvas(64, 64), g = c.getContext('2d');
    const uv = (part) => { const r = SKIN_UV[part].slice(); if (slim && /arm|sleeve/i.test(part)) r[2] = 3; return uvRects(...r); };
    const P = {
      g,
      fill(part, color, sides = ['top', 'bottom', 'left', 'front', 'right', 'back'], grain = 0.06) {
        const R = uv(part);
        for (const side of sides) {
          const [x0, y0, w, h] = R[side];
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            g.fillStyle = shade(color, 1 - grain / 2 + hash(x0 + x, y0 + y, 7) * grain);
            g.fillRect(x0 + x, y0 + y, 1, 1);
          }
        }
      },
      rect(part, side, x, y, w, h, color) { const [x0, y0] = uv(part)[side]; g.fillStyle = color; g.fillRect(x0 + x, y0 + y, w, h); },
      px(part, side, x, y, color) { P.rect(part, side, x, y, 1, 1, color); },
      clear(part, side, x, y, w, h) { const [x0, y0] = uv(part)[side]; g.clearRect(x0 + x, y0 + y, w, h); },
      // Same rect on the four sides of a limb or body, as a band.
      band(part, y, h, color) { for (const s of ['front', 'right', 'back', 'left']) { const [, , w] = uv(part)[s]; P.rect(part, s, 0, y, w, h, color); } },
      size(part, side) { return uv(part)[side].slice(2); },
    };
    fn(P);
    c.slim = slim;
    return c;
  }
  // The skin Tailor shows until it knows yours: our own linen-shirt look.
  let fallback;
  function defaultSkin() {
    if (fallback) return fallback;
    fallback = paintSkin((P) => {
      P.fill('head', '#e2b796');
      P.fill('head', '#6b4a32', ['top']); P.band('head', 0, 2, '#6b4a32'); P.rect('head', 'back', 0, 0, 8, 5, '#6b4a32');
      P.rect('head', 'front', 1, 4, 2, 1, '#ffffff'); P.rect('head', 'front', 5, 4, 2, 1, '#ffffff');
      P.px('head', 'front', 2, 4, '#3a2a22'); P.px('head', 'front', 5, 4, '#3a2a22');
      P.rect('head', 'front', 3, 6, 2, 1, '#b0745a');
      P.fill('body', '#efe6d4'); P.fill('armR', '#efe6d4'); P.fill('armL', '#efe6d4');
      P.band('armR', 9, 3, '#e2b796'); P.band('armL', 9, 3, '#e2b796');
      P.rect('body', 'front', 3, 0, 2, 3, '#e2b796'); P.rect('body', 'front', 4, 3, 1, 8, '#d8ccb4');
      P.band('body', 10, 2, '#6b4f3a');
      P.fill('legR', '#5b4a3e'); P.fill('legL', '#5b4a3e'); P.band('legR', 10, 2, '#2c2420'); P.band('legL', 10, 2, '#2c2420');
    });
    return fallback;
  }

  // The model -------------------------------------------------------------------
  const box = (x0, y0, z0, x1, y1, z1, color, more = {}) => ({ box: [x0, y0, z0, x1, y1, z1], color, ...more });

  // Hats sit on the head (x and z from -4 to 4, top at y = 32), over the hat layer.
  function hatParts(item) {
    const [a, b = a] = item.colors;
    const tilt = (p) => ({ ...p, tf: [{ at: [0, 31, 0], r: [0, 0, -8] }] });
    const H = {
      beret: () => [tilt(box(-4.7, 31.4, -4.7, 4.9, 33.6, 4.7, a)), tilt(box(-0.5, 33.6, -0.5, 0.5, 34.5, 0.5, a))],
      beanie: () => [box(-4.5, 31, -4.5, 4.5, 35, 4.5, a), box(-4.75, 29.6, -4.75, 4.75, 31.4, 4.75, b), box(-1.2, 35, -1.2, 1.2, 37, 1.2, b)],
      bowler: () => [box(-5.8, 31.4, -5.8, 5.8, 32.2, 5.8, a), box(-4.4, 32.2, -4.4, 4.4, 35.6, 4.4, a), box(-4.5, 32.2, -4.5, 4.5, 33, 4.5, b)],
      boater: () => [box(-6.6, 31.6, -6.6, 6.6, 32.2, 6.6, a), box(-4.4, 32.2, -4.4, 4.4, 34.4, 4.4, a), box(-4.5, 32.2, -4.5, 4.5, 33.1, 4.5, b)],
      bucket: () => [box(-6, 30.6, -6, 6, 31.4, 6, b), box(-4.6, 31.4, -4.6, 4.6, 34.6, 4.6, a)],
      topper: () => [box(-6, 31.6, -6, 6, 32.2, 6, a), box(-4, 32.2, -4, 4, 39.4, 4, a), box(-4.1, 32.2, -4.1, 4.1, 33.6, 4.1, b)],
      cloche: () => [box(-4.7, 29.4, -4.7, 4.7, 34.4, 4.7, a), box(-5.3, 29.2, 2.4, 5.3, 30, 5.6, b)],
      fez: () => [box(-3, 31.6, -3, 3, 36, 3, a), box(-0.35, 36, -0.35, 0.35, 36.3, 0.35, b), box(2.8, 33, -0.35, 3.3, 36, 0.35, b)],
      visor: () => [box(-4.6, 29.4, -4.6, 4.6, 31.2, 4.6, a), box(-4.2, 29.4, 4.6, 4.2, 30, 8.2, b)],
      halo: () => [box(-4, 35.2, -4, 4, 36, -3.1, a), box(-4, 35.2, 3.1, 4, 36, 4, a), box(-4, 35.2, -3.1, -3.1, 36, 3.1, a), box(3.1, 35.2, -3.1, 4, 36, 3.1, a)],
      antlers: () => [-1, 1].flatMap((s) => [box(s * 2.6 - 0.5, 31.8, -0.5, s * 2.6 + 0.5, 35.8, 0.5, a), box(Math.min(s * 2.6, s * 5.4), 34.6, -0.5, Math.max(s * 2.6, s * 5.4), 35.4, 0.5, a), box(s * 5 - 0.45, 35.4, -0.45, s * 5 + 0.45, 37.2, 0.45, a), box(s * 2.6 - 0.45, 35.8, -0.45, s * 2.6 + 0.45, 37.8, 0.45, a)]),
      crown: () => [box(-4.4, 31.6, -4.4, 4.4, 33.2, 4.4, a), ...[-3.4, 0, 3.4].flatMap((x) => [box(x - 0.7, 33.2, 3.6, x + 0.7, 35, 4.4, a), box(x - 0.7, 33.2, -4.4, x + 0.7, 35, -3.6, a)]), box(-0.8, 32, 4.4, 0.8, 33, 4.7, b)],
    };
    return H[item.motif]();
  }

  // Shoulder pets ride on the left shoulder (x 4 to 8, top at y = 24), facing forward.
  function petParts(item) {
    const [a, b, c] = item.colors;
    const eyes = (x0, x1, y, z) => [box(x0, y, z, x0 + 0.6, y + 0.6, z + 0.12, c), box(x1 - 0.6, y, z, x1, y + 0.6, z + 0.12, c)];
    const tail = (r) => ({ tf: [{ at: [6, 24.4, -2.4], r: [r, 0, 0] }] });
    const P = {
      fox: () => [
        box(4.6, 24, -2.4, 7.6, 26.4, 1.4, a), box(4.4, 25.2, 1, 7.8, 28.2, 3.8, a),
        box(5.4, 25.2, 3.8, 6.8, 26.4, 5.2, b), box(5.85, 26, 5.2, 6.35, 26.5, 5.4, c),
        box(4.5, 28.2, 2, 5.5, 29.4, 2.8, a), box(6.7, 28.2, 2, 7.7, 29.4, 2.8, a),
        box(4.5, 29.1, 2, 5.5, 29.4, 2.8, c), box(6.7, 29.1, 2, 7.7, 29.4, 2.8, c),
        ...eyes(4.9, 7.3, 26.9, 3.8),
        box(5.3, 21.8, -4.4, 6.9, 24.6, -2.4, a, tail(-24)), box(5.3, 20.6, -4.4, 6.9, 21.8, -2.4, b, tail(-24)),
      ],
      owl: () => [
        box(4.4, 24, -1.8, 7.8, 28.6, 1.8, a), box(4.9, 24.4, 1.8, 7.3, 27.4, 1.95, b),
        box(4.7, 27.4, 1.8, 5.9, 28.4, 1.95, b), box(6.3, 27.4, 1.8, 7.5, 28.4, 1.95, b),
        box(5.05, 27.65, 1.95, 5.55, 28.15, 2.05, c), box(6.65, 27.65, 1.95, 7.15, 28.15, 2.05, c),
        box(5.9, 26.8, 1.8, 6.3, 27.4, 2.4, '#e1b84a'), box(4.4, 28.6, -0.6, 5.2, 29.6, 0.4, a), box(7, 28.6, -0.6, 7.8, 29.6, 0.4, a),
      ],
      cat: () => [
        box(4.7, 24, -2.4, 7.5, 26.2, 1.2, a), box(4.5, 25, 0.8, 7.7, 27.8, 3.4, a),
        box(4.6, 27.8, 1.8, 5.4, 28.8, 2.6, a), box(6.8, 27.8, 1.8, 7.6, 28.8, 2.6, a),
        box(5.5, 25, 3.4, 6.7, 25.9, 3.9, b), ...eyes(4.9, 7.3, 26.4, 3.4),
        box(5.6, 26, -3.6, 6.6, 30, -2.6, a, { tf: [{ at: [6, 26, -2.4], r: [-12, 0, 0] }] }),
      ],
      frog: () => [
        box(4.4, 24, -1.6, 7.8, 25.8, 2.2, a), box(4.6, 24, 2.2, 7.6, 24.8, 2.4, b),
        box(4.4, 25.8, 0.6, 5.6, 26.8, 1.8, a), box(6.6, 25.8, 0.6, 7.8, 26.8, 1.8, a),
        box(4.7, 26, 1.8, 5.3, 26.6, 1.9, c), box(6.9, 26, 1.8, 7.5, 26.6, 1.9, c),
      ],
      bunny: () => [
        box(4.6, 24, -2, 7.6, 26.4, 1.4, a), box(4.7, 25.4, 1, 7.5, 28, 3.4, a),
        box(4.9, 28, 1.8, 5.7, 31.4, 2.4, a), box(6.5, 28, 1.8, 7.3, 31.4, 2.4, a),
        box(5.1, 28.4, 2.4, 5.5, 31, 2.5, b), box(6.7, 28.4, 2.4, 7.1, 31, 2.5, b),
        box(5.8, 25.6, 3.4, 6.4, 26.1, 3.55, b), ...eyes(5.1, 7.1, 26.6, 3.4), box(5.4, 24.6, -2.8, 6.8, 26, -2, a),
      ],
      crow: () => [
        box(4.8, 24, -1.8, 7.4, 26.8, 1.6, a), box(4.8, 26.4, 0.6, 7.4, 28.6, 2.8, a),
        box(5.6, 26.9, 2.8, 6.6, 27.7, 4.4, c), ...eyes(5, 7.2, 27.6, 2.8),
        box(5.2, 23.6, -3.8, 7, 25, -1.8, b, { tf: [{ at: [6, 25, -1.8], r: [-20, 0, 0] }] }),
        box(4.6, 24.2, -1.4, 4.8, 26.4, 1.2, b), box(7.4, 24.2, -1.4, 7.6, 26.4, 1.2, b),
      ],
    };
    return P[item.motif]();
  }

  // Emote poses: rotations for the arms, legs, head and upper body, by time.
  function pose(emote, t) {
    const p = { armR: [0, 0, 0], armL: [0, 0, 0], legR: [0, 0, 0], legL: [0, 0, 0], head: [0, 0, 0], upper: [0, 0, 0], lift: 0 };
    const w = Math.sin(t * 7);
    switch (emote) {
      case 'wave': p.armR = [0, 0, -152 + w * 14]; p.armL = [0, 0, 4]; p.head = [0, -6, 4]; break;
      case 'dance': {
        const k = Math.sin(t * 6);
        p.armR = [0, 0, -120 * Math.max(0, k) - 10]; p.armL = [0, 0, 120 * Math.max(0, -k) + 10];
        p.upper = [0, k * 14, k * 6]; p.legR = [-k * 16, 0, 0]; p.legL = [k * 16, 0, 0]; p.lift = Math.abs(k) * 0.8; break;
      }
      case 'sit': p.legR = [-90, 6, 0]; p.legL = [-90, -6, 0]; p.armR = [-24, 0, -6]; p.armL = [-24, 0, 6]; p.lift = -10; break;
      case 'point': p.armR = [-88, -6, 0]; p.head = [0, -8, 0]; break;
      case 'clap': { const k = 20 + Math.abs(w) * 16; p.armR = [-74, k, 0]; p.armL = [-74, -k, 0]; break; }
      case 'bow': p.upper = [34, 0, 0]; p.armR = [10, 0, -4]; p.armL = [10, 0, 4]; break;
      case 'facepalm': p.armR = [-128, 28, 0]; p.head = [16, 0, 0]; p.upper = [8, 0, 0]; break;
      case 'gg': p.armR = [0, 0, -158 + w * 6]; p.armL = [0, 0, 158 - w * 6]; break;
      default: break;
    }
    return p;
  }

  // A part of the skinned body: a box mapped onto its UV, plus the outer layer.
  function skinned(parts, skin, name, layer, b, tf, inflate) {
    const [u, v, w, h, d] = SKIN_UV[name];
    const slim = skin.slim && /arm/i.test(name);
    parts.push({ box: b, tex: skin, rects: uvRects(u, v, slim ? 3 : w, h, d), tf });
    const [lu, lv] = SKIN_UV[layer];
    const g = inflate;
    parts.push({ box: [b[0] - g, b[1] - g, b[2] - g, b[3] + g, b[4] + g, b[5] + g], tex: skin, rects: uvRects(lu, lv, slim ? 3 : w, h, d), tf, layer: true });
  }

  // Everything one player is made of, in their own space (feet at y = 0, facing +z).
  function build(fig) {
    const look = fig.look || {}, t = fig.t || 0;
    const ps = pose(fig.emote, t);
    const parts = [];
    const upper = [{ at: [0, 12, 0], r: ps.upper }];
    const shoulder = (x, r) => [{ at: [x, 22, 0], r }, ...upper];
    const headTf = [{ at: [0, 24, 0], r: ps.head }, ...upper];
    if (!fig.bare) {
      const skin = fig.skin || defaultSkin();
      const aw = skin.slim ? 3 : 4;
      skinned(parts, skin, 'legR', 'pantsR', [-4, 0, -2, 0, 12, 2], [{ at: [-2, 12, 0], r: ps.legR }], 0.25);
      skinned(parts, skin, 'legL', 'pantsL', [0, 0, -2, 4, 12, 2], [{ at: [2, 12, 0], r: ps.legL }], 0.25);
      skinned(parts, skin, 'body', 'jacket', [-4, 12, -2, 4, 24, 2], upper, 0.25);
      skinned(parts, skin, 'armR', 'sleeveR', [-4 - aw, 12, -2, -4, 24, 2], shoulder(-5, ps.armR), 0.25);
      skinned(parts, skin, 'armL', 'sleeveL', [4, 12, -2, 4 + aw, 24, 2], shoulder(5, ps.armL), 0.25);
      skinned(parts, skin, 'head', 'hat', [-4, 24, -4, 4, 32, 4], headTf, 0.5);
    }
    if (look.cape) {
      let tex;
      if (look.cape.custom) tex = look.cape.custom;
      else if (look.cape.squad) tex = squadTexture(look.cape.squad);
      else tex = capeTexture(look.cape);
      const r = uvRects(0, 0, 10, 16, 1);
      const s = tex.layoutScale;
      const scaled = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.map((n) => n * s)]));
      // The outer face (layout 1, 1) is what you see from behind.
      const rects = { ...scaled, back: scaled.front, front: scaled.back };
      const base = fig.emote === 'sit' ? 2 : fig.emote === 'bow' ? -20 : 6;
      const sway = fig.sway === false ? 0 : Math.sin(t * 1.7) * 2.2 + Math.sin(t * 0.9) * 1.2;
      parts.push({ box: [-5, 8, -3.1, 5, 24, -2.1], tex, rects, tf: [{ at: [0, 24, -2.1], r: [base + sway, 0, 0] }, ...upper], backBias: 3 });
    }
    if (look.wings) {
      const tex = wingTexture(look.wings);
      const flap = fig.sway === false ? 0 : Math.sin(t * 1.3) * 3;
      for (const s of [-1, 1]) {
        parts.push({
          plane: [[0, 6.4, 0], [s * 12.4, 6.4, 0], [0, -2.9, 0]], tex, alpha: tex.alpha,
          tf: [{ at: [0, 0, 0], r: [10, s * (34 + flap), 0] }, { move: [s * 0.6, 21.6, -3.8] }, ...upper],
          backBias: 6,
        });
      }
    }
    if (look.hat) for (const h of hatParts(ITEM[look.hat])) { h.tf = [...(h.tf || []), ...headTf]; parts.push(h); }
    if (look.pet) for (const q of petParts(ITEM[look.pet])) { q.tf = [...(q.tf || []), ...shoulder(5, [0, 0, 0])]; parts.push(q); }
    return { parts, lift: ps.lift };
  }

  function apply(p, tf) {
    if (!tf) return p;
    for (const t of tf) p = t.move ? add(p, t.move) : add(rot(sub(p, t.at), t.r), t.at);
    return p;
  }
  // Faces of a box as [top-left, top-right, bottom-left] of each face's texture.
  function boxFaces([x0, y0, z0, x1, y1, z1]) {
    return {
      front: [[x0, y1, z1], [x1, y1, z1], [x0, y0, z1]],
      back: [[x1, y1, z0], [x0, y1, z0], [x1, y0, z0]],
      right: [[x1, y1, z1], [x1, y1, z0], [x1, y0, z1]],
      left: [[x0, y1, z0], [x0, y1, z1], [x0, y0, z0]],
      top: [[x0, y1, z0], [x1, y1, z0], [x0, y1, z1]],
      bottom: [[x0, y0, z1], [x1, y0, z1], [x0, y0, z0]],
    };
  }

  // Lit copies of a texture, so each face is one plain drawImage.
  const lit = new WeakMap();
  function litTexture(tex, k) {
    const level = Math.max(8, Math.min(26, Math.round(k * 24)));
    let m = lit.get(tex);
    if (!m) lit.set(tex, (m = new Map()));
    if (!m.has(level)) {
      const c = canvas(tex.width, tex.height), g = c.getContext('2d');
      g.filter = `brightness(${level / 24})`;
      g.drawImage(tex, 0, 0);
      m.set(level, c);
    }
    return m.get(level);
  }

  // Draw one player. `fig`: { skin, look, emote, t, yaw, x, z, sway, bare }.
  // `view`: { cx, cy, scale, pitch, base, shadow }. Returns screen anchors.
  function render(ctx, fig, view) {
    const { parts, lift } = build(fig);
    const yaw = fig.yaw || 0, pitch = view.pitch ?? 10, s = view.scale;
    const toView = (p) => {
      let q = rot(p, [0, yaw, 0]);
      q = [q[0] + (fig.x || 0), q[1] + lift, q[2] + (fig.z || 0)];
      return rot(q, [pitch, 0, 0]);
    };
    const scr = (q) => [view.cx + q[0] * s, view.cy - q[1] * s];
    const backVisible = rot(rot([0, 0, -1], [0, yaw, 0]), [pitch, 0, 0])[2] > 0;
    const ground = (r, y = 0) => {
      const [x, yy] = scr(toView([0, y - lift, 0]));
      return { x, y: yy, rx: r * s, ry: r * s * Math.sin(pitch * RAD) };
    };
    if (view.shadow !== false) {
      const g0 = ground(view.base ? 13 : 8, view.base ? -2.2 : 0);
      ctx.save();
      ctx.translate(g0.x, g0.y); ctx.scale(1, g0.ry / g0.rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, g0.rx);
      gr.addColorStop(0, 'rgba(50,36,24,0.32)'); gr.addColorStop(0.6, 'rgba(50,36,24,0.14)'); gr.addColorStop(1, 'rgba(50,36,24,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, g0.rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (view.base) {
      const top = ground(10.5, 0), bot = ground(10.5, -2.2);
      ctx.fillStyle = '#8f6a45';
      ctx.beginPath(); ctx.ellipse(bot.x, bot.y, bot.rx, bot.ry, 0, 0, Math.PI);
      ctx.lineTo(top.x - top.rx, top.y); ctx.ellipse(top.x, top.y, top.rx, top.ry, 0, Math.PI, 0, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b98d5f'; ctx.beginPath(); ctx.ellipse(top.x, top.y, top.rx, top.ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,84,50,0.35)'; ctx.lineWidth = 1;
      for (const k of [0.78, 0.55, 0.3]) { ctx.beginPath(); ctx.ellipse(top.x, top.y, top.rx * k, top.ry * k, 0, 0, Math.PI * 2); ctx.stroke(); }
    }

    const list = [];
    for (const part of parts) {
      if (part.plane) {
        const [tl, tr, bl] = part.plane.map((p) => toView(apply(p, part.tf)));
        const n = norm(cross(sub(bl, tl), sub(tr, tl)));
        list.push({ tl, tr, bl, n, plane: true, tex: part.tex, alpha: part.alpha, depth: (tr[2] + bl[2]) / 2 + (backVisible ? part.backBias || 0 : 0) });
        continue;
      }
      const fs = boxFaces(part.box);
      for (const name in fs) {
        const [tl, tr, bl] = fs[name].map((p) => toView(apply(p, part.tf)));
        const n = norm(cross(sub(bl, tl), sub(tr, tl)));
        if (n[2] <= 0.001) continue;
        const bias = (name === 'back' && backVisible ? part.backBias || 0 : 0) + (part.layer ? 0.05 : 0);
        let tex = part.tex, rect = part.rects && part.rects[name];
        if (!tex) {
          const [w, h] = { front: [part.box[3] - part.box[0], part.box[4] - part.box[1]], back: [part.box[3] - part.box[0], part.box[4] - part.box[1]], left: [part.box[5] - part.box[2], part.box[4] - part.box[1]], right: [part.box[5] - part.box[2], part.box[4] - part.box[1]], top: [part.box[3] - part.box[0], part.box[5] - part.box[2]], bottom: [part.box[3] - part.box[0], part.box[5] - part.box[2]] }[name];
          tex = voxel(part.color, w, h);
        }
        if (!rect) rect = [0, 0, tex.width, tex.height];
        list.push({ tl, tr, bl, n, tex, rect, depth: (tr[2] + bl[2]) / 2 + bias });
      }
    }
    list.sort((a, b) => a.depth - b.depth);

    for (const f of list) {
      const light = f.plane ? Math.abs(dot(f.n, KEY)) : Math.max(0, dot(f.n, KEY));
      const k = 0.58 + 0.47 * light;
      const [ax, ay] = scr(f.tl), [bx, by] = scr(f.tr), [cx, cy] = scr(f.bl);
      const [sx, sy, sw, sh] = f.rect || [0, 0, f.tex.width, f.tex.height];
      const img = litTexture(f.tex, k);
      // A hair of overdraw hides seams between neighbouring faces.
      const px = Math.max(1e-3, Math.min(Math.hypot(bx - ax, by - ay) / sw, Math.hypot(cx - ax, cy - ay) / sh));
      const e = Math.min(0.35, 0.45 / px);
      ctx.save();
      ctx.imageSmoothingEnabled = Boolean(f.tex.smooth);
      if (f.alpha) ctx.globalAlpha = f.alpha;
      ctx.transform((bx - ax) / sw, (by - ay) / sw, (cx - ax) / sh, (cy - ay) / sh, ax, ay);
      ctx.drawImage(img, sx, sy, sw, sh, -e, -e, sw + 2 * e, sh + 2 * e);
      ctx.restore();
    }
    return { head: scr(toView([0, 33 + (fig.look && fig.look.hat ? 4.5 : 0), 0])), feet: scr(toView([0, 0, 0])) };
  }

  // The turning player in the app -----------------------------------------------
  class Turntable {
    constructor(canvasEl, opts = {}) {
      this.canvas = canvasEl;
      this.opts = { scale: 10, base: true, pitch: 10, offsetY: 0, ...opts };
      this.look = {};
      this.skin = opts.skin || null;
      this.emote = null;
      this.yaw = opts.yaw ?? 205;
      this.speed = opts.speed ?? 12;
      this.spinning = opts.spin !== false;
      // With `idle` (ms), a still player starts turning slowly after that long untouched.
      this.idle = opts.idle || 0;
      this.touched = performance.now();
      this.frozen = null;
      this.step = 0;
      this.t0 = performance.now();
      this.turn = null;
      this.last = performance.now();
      this.loop = this.loop.bind(this);
      this.dragging = false;
      canvasEl.addEventListener('pointerdown', (e) => {
        this.dragging = true; this.spinning = false; this.turn = null; this.touched = performance.now();
        const x0 = e.clientX, y0 = this.yaw;
        canvasEl.setPointerCapture(e.pointerId);
        const move = (ev) => { this.yaw = y0 + (ev.clientX - x0) * 0.6; this.draw(); };
        canvasEl.addEventListener('pointermove', move);
        canvasEl.addEventListener('pointerup', () => { this.dragging = false; canvasEl.removeEventListener('pointermove', move); }, { once: true });
      });
      requestAnimationFrame(this.loop);
    }
    set(look) { this.look = { ...look }; this.touched = performance.now(); this.draw(); }
    setSkin(skin) { this.skin = skin; this.draw(); }
    play(emote) { this.emote = emote; this.t0 = performance.now(); this.draw(); }
    still(yaw) { this.spinning = false; this.turn = null; this.idle = 0; if (yaw != null) this.yaw = yaw; this.draw(); }
    spin(on = true) { this.spinning = on; this.last = performance.now(); }
    // Stops time for captures: the cape and wings hold this pose.
    freeze(t = 0.6) { this.frozen = t; this.idle = 0; this.spinning = false; this.draw(); }
    turnBy(by, ms = 900) { this.spinning = false; this.touched = performance.now(); this.turn = { from: this.yaw, by, t0: performance.now(), ms }; }
    turnTo(yaw, ms = 900) { this.turnBy(((yaw - this.yaw + 540) % 360) - 180, ms); }
    loop(now) {
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.idle && !this.spinning && !this.turn && !this.dragging && now - this.touched > this.idle) this.spinning = true;
      const moving = Boolean(this.turn) || (this.spinning && !this.dragging);
      if (this.turn) {
        const u = Math.min(1, (now - this.turn.t0) / this.turn.ms);
        this.yaw = this.turn.from + this.turn.by * (1 - Math.pow(1 - u, 3));
        if (u >= 1) this.turn = null;
      } else if (this.spinning && !this.dragging) this.yaw += this.speed * dt;
      if (this.frozen == null || moving) this.draw(now);
      requestAnimationFrame(this.loop);
    }
    draw(now = performance.now()) {
      const c = this.canvas, dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth, h = c.clientHeight;
      if (!w || !h) return;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const o = this.opts;
      let t = this.frozen ?? (now - this.t0) / 1000;
      // `step` holds each pose a little longer; captures use it to keep GIFs small.
      if (this.step) t = Math.floor(t / this.step) * this.step;
      render(ctx, { skin: this.skin, look: this.look, emote: this.emote, t, yaw: this.yaw }, {
        cx: w / 2, cy: h / 2 + 16 * o.scale + o.offsetY, scale: o.scale, pitch: o.pitch, base: o.base,
      });
    }
  }

  // The face on a skin (head front plus the hat layer), for round avatars.
  function faceOf(skin, size) {
    const c = canvas(size, size), g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(skin, 8, 8, 8, 8, 0, 0, size, size);
    g.drawImage(skin, 40, 8, 8, 8, 0, 0, size, size);
    return c;
  }

  window.Figure = {
    CATALOG, ITEM, EMBLEMS, render, Turntable, paintSkin, defaultSkin, faceOf,
    capeFace, capeTexture, squadFace, squadTexture, customTexture, wingTexture, emblemPath, mix,
  };
})();
