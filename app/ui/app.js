// Tailor's window: the wardrobe, the squad cape and your own cape, plus the
// one-time first run. figure.js draws the player; this file turns the player's
// choices into screens. `window.tailor` drives it for captures.
(function () {
  'use strict';
  const F = window.Figure;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (sel, root = document) => root.querySelector(sel);

  const I = (d) => `<svg class="i" viewBox="0 0 16 16">${d}</svg>`;
  const icon = {
    min: '<svg viewBox="0 0 10 10"><path d="M0 5.5h10"/></svg>',
    max: '<svg viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9"/></svg>',
    close: '<svg viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10"/></svg>',
    check: I('<path d="M3.5 8.5l3 3 6-7"/>'),
    copy: I('<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"/>'),
    chevron: I('<path d="M6 3.5l4.5 4.5L6 12.5"/>'),
    picture: I('<rect x="2" y="3" width="12" height="10" rx="2"/><circle cx="6" cy="6.5" r="1.2"/><path d="M2.5 11.5l3.5-3.5 3 3 2-2 2.5 2.5"/>'),
    move: I('<path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2"/>'),
    invite: I('<circle cx="6" cy="5.5" r="2.5"/><path d="M1.8 13.5c.6-2.4 2.2-3.6 4.2-3.6s3.6 1.2 4.2 3.6M12.5 5v5M10 7.5h5"/>'),
  };
  // The mark: a thread-blue cape on a hanger, with one yellow stitch.
  const mark = `<svg viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="15" fill="#fffdf8" stroke="rgba(27,26,23,.16)" stroke-width="2"/>
    <path d="M32 15V12.2a3.2 3.2 0 1 1 3.2-3.2" fill="none" stroke="#1b1a17" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M18.6 24h26.8l3.4 30Q32 57.4 15.2 54Z" fill="#2f5bd3"/>
    <path d="M32 15L13 24h38Z" fill="none" stroke="#1b1a17" stroke-width="2.8" stroke-linejoin="round"/>
    <path d="M16.6 47.6Q32 51.2 47.4 47.6" fill="none" stroke="#f2c230" stroke-width="2.8" stroke-dasharray="3.4 2.8" stroke-linecap="round"/></svg>`;

  const KIND = {
    cape: { chip: 'Capes', label: 'Cape' },
    wings: { chip: 'Wings', label: 'Wings' },
    hat: { chip: 'Hats', label: 'Hat' },
    pet: { chip: 'Pets', label: 'Shoulder pet' },
    emote: { chip: 'Emotes', label: 'Emote' },
  };
  const of = (kind) => F.CATALOG.filter((i) => i.kind === kind);
  // Which side shows a piece best: capes and wings from behind, the rest from the front.
  const SIDE = { cape: 'back', wings: 'back', hat: 'front', pet: 'front', emote: 'front' };
  const YAW = { front: 22, back: 202 };

  // The player in the README screenshots.
  const S = {
    tab: 'wardrobe',
    kind: 'cape',
    pick: 'cape.ember',
    worn: { cape: 'cape.tide', wings: 'wings.moth', hat: null, pet: 'pet.fox' },
    me: 'nightowl_07',
    skins: {},
    squad: {
      name: 'Wolves', code: 'WOLF-7Q2K', emblem: 'wolf', colors: ['#27324a', '#d9d2c3'],
      members: ['nightowl_07', 'mossy', 'kai_builds', 'Lumen', 'ripley_r'],
    },
    custom: null,
    show: true,
    customFrom: 'Everyone',
  };
  let fig = null;
  let loops = [];

  // Skins ---------------------------------------------------------------------------
  // A player's own skin, from Mojang's public profile API. No login needed.
  async function fetchSkin(name) {
    const get = (window.__TAURI__ && window.__TAURI__.http && window.__TAURI__.http.fetch) || window.fetch;
    const profile = await (await get(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`)).json();
    const session = await (await get(`https://sessionserver.mojang.com/session/minecraft/profile/${profile.id}`)).json();
    const textures = JSON.parse(atob(session.properties.find((p) => p.name === 'textures').value)).textures;
    if (!textures.SKIN) return null;
    const img = await createImageBitmap(await (await get(textures.SKIN.url)).blob());
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    // Old 64 × 32 skins: the left arm and leg mirror the right ones, face by face, as the game does.
    if (img.height === 32) {
      const mirror = (u, v, tu, tv) => {
        const faces = [[4, 0, 4, 4, 4, 0], [8, 0, 4, 4, 8, 0], [0, 4, 4, 12, 8, 4], [4, 4, 4, 12, 4, 4], [8, 4, 4, 12, 0, 4], [12, 4, 4, 12, 12, 4]];
        for (const [sx, sy, w, h, dx, dy] of faces) {
          g.save(); g.translate(tu + dx + w, tv + dy); g.scale(-1, 1);
          g.drawImage(img, u + sx, v + sy, w, h, 0, 0, w, h);
          g.restore();
        }
      };
      mirror(0, 16, 16, 48);
      mirror(40, 16, 32, 48);
    }
    c.slim = Boolean(textures.SKIN.metadata && textures.SKIN.metadata.model === 'slim');
    return c;
  }
  const skinOf = (name) => S.skins[name] || F.defaultSkin();
  function loadSkin(name) {
    if (S.skins[name]) return;
    fetchSkin(name).then((skin) => {
      if (!skin) return;
      S.skins[name] = skin;
      if (fig && name === S.me) fig.setSkin(skin);
    }).catch(() => {});
  }

  // Shell -----------------------------------------------------------------------------
  const root = document.getElementById('app');
  root.innerHTML = `
    <div class="win" id="win">
      <header class="titlebar">
        <div class="brand">${mark}<b>Tailor</b></div>
        <nav class="tabs" id="tabs">
          <button data-tab="wardrobe">Wardrobe</button>
          <button data-tab="squad">Squad</button>
          <button data-tab="custom">Make your own</button>
        </nav>
        <button class="who" id="who"><span class="dot"></span>${S.me}</button>
        <div class="winctl"><span>${icon.min}</span><span>${icon.max}</span><span>${icon.close}</span></div>
      </header>
      <main class="view" id="view"></main>
      <div class="toast" id="toast"><span class="tick">${icon.check}</span><span></span></div>
    </div>`;
  const view = $('#view');
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.tab); });
  $('#who').addEventListener('click', () => settings());

  function go(tab) {
    S.tab = tab;
    $('#win').classList.toggle('first-run', tab === 'first');
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    closeOverlays();
    loops.forEach(clearInterval);
    loops = [];
    ({ wardrobe, squad, custom, first: firstRun }[tab])();
  }
  function mount(html) {
    view.innerHTML = `<div class="screen">${html}</div>`;
    return view.firstElementChild;
  }

  let toastTimer;
  function toast(text, ms = 2800) {
    const t = $('#toast');
    t.lastElementChild.textContent = text;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), ms);
  }

  // Drawing helpers -------------------------------------------------------------------
  function sized(c) {
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    return [g, w, h];
  }

  // A preview of any piece: capes flat, wings as a pair, hats and pets in 3D, emotes as a pose.
  function thumb(item, c) {
    const [g, w, h] = sized(c);
    g.clearRect(0, 0, w, h);
    if (item.kind === 'cape') {
      const cw = 60, ch = 96, x = Math.round((w - cw) / 2), y = Math.round((h - ch) / 2);
      g.save(); g.shadowColor = 'rgba(60,40,24,0.28)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
      g.fillStyle = '#000'; g.fillRect(x, y, cw, ch); g.restore();
      g.drawImage(F.capeFace(item.id), x, y, cw, ch);
      return;
    }
    if (item.kind === 'wings') {
      const t = F.wingTexture(item.id), ww = 58, wh = ww * 0.75, y = (h - wh) / 2 - 2;
      g.globalAlpha = t.alpha || 1;
      g.drawImage(t, w / 2 + 1, y, ww, wh);
      g.save(); g.translate(w / 2 - 1, y); g.scale(-1, 1); g.drawImage(t, 0, 0, ww, wh); g.restore();
      g.globalAlpha = 1;
      return;
    }
    if (item.kind === 'hat') {
      return F.render(g, { bare: true, look: { hat: item.id }, yaw: 28 }, { cx: w / 2, cy: h / 2 + 33.4 * 5.4, scale: 5.4, pitch: 18, shadow: false });
    }
    if (item.kind === 'pet') {
      const yaw = -36, s = 9;
      return F.render(g, { bare: true, look: { pet: item.id }, yaw, x: -6 * Math.cos(yaw * Math.PI / 180) }, { cx: w / 2, cy: h / 2 + 26.6 * s, scale: s, pitch: 14, shadow: false });
    }
    return F.render(g, { skin: skinOf(S.me), look: {}, emote: item.id.split('.')[1], t: 0.25, yaw: 18, sway: false }, { cx: w / 2, cy: h / 2 + 16 * 2.9 + 4, scale: 2.9, pitch: 10 });
  }

  // Wardrobe --------------------------------------------------------------------------
  function lookWith(id) {
    const item = F.ITEM[id];
    const look = { ...S.worn };
    if (item.kind !== 'emote') look[item.kind] = item.id;
    return look;
  }

  function tape(width = 900) {
    let s = '';
    for (let x = 14, i = 0; x < width; x += 6, i++) {
      const h = i % 10 === 0 ? 9 : i % 5 === 0 ? 6.5 : 4;
      s += `<rect x="${x}" y="0" width="1" height="${h}"/>`;
      if (i % 10 === 0 && i) s += `<text x="${x + 3}" y="14">${i / 2}</text>`;
    }
    return `<svg width="${width}" height="17" fill="rgba(27,26,23,.62)" font-family="Inter, sans-serif" font-size="7.5" font-weight="600"><rect x="0" y="0" width="10" height="17" fill="#c9c1b2"/>${s}</svg>`;
  }

  function wardrobe() {
    loadSkin(S.me);
    const el = mount(`
      <section class="wardrobe">
        <div class="card stage taped">
          <div class="tape">${tape()}</div>
          <canvas class="figure" id="fig"></canvas>
          <div class="seg side" id="side"><button data-side="front">Front</button><button data-side="back">Back</button></div>
        </div>
        <div class="picker">
          <div class="chips" id="chips">${Object.entries(KIND).map(([k, v]) => `<button class="chip" data-kind="${k}">${v.chip}</button>`).join('')}</div>
          <div class="grid" id="grid"></div>
          <div class="detail" id="pick"></div>
        </div>
      </section>`);
    fig = new F.Turntable($('#fig', el), { skin: skinOf(S.me), scale: 11.6, yaw: YAW.back, speed: 9, offsetY: -2, spin: false, idle: 7000 });
    fig.step = window.tailor ? window.tailor.step : 0;
    $('#chips', el).addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (b) chip(b.dataset.kind); });
    $('#side', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) side(b.dataset.side); });
    const grid = $('#grid', el);
    grid.addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (b) pick(b.dataset.id); });
    // Pointing at a card puts it on the player at once; leaving the grid puts back the pick.
    grid.addEventListener('pointerover', (e) => { const b = e.target.closest('.sw'); if (b) preview(b.dataset.id); });
    grid.addEventListener('pointerleave', () => preview(S.pick));
    chip(S.kind, S.pick);
  }

  function side(which, ms = 700) {
    document.querySelectorAll('#side button').forEach((b) => b.classList.toggle('on', b.dataset.side === which));
    if (fig) fig.turnTo(YAW[which], ms);
  }

  function chip(kind, keep) {
    S.kind = kind;
    document.querySelectorAll('#chips .chip').forEach((b) => b.classList.toggle('on', b.dataset.kind === kind));
    const items = of(kind);
    $('#grid').innerHTML = items.map((i) => `
      <button class="sw" data-id="${i.id}"><canvas></canvas><b>${i.name}</b>${i.new ? '<span class="tag new">New</span>' : ''}</button>`).join('');
    $('#grid').scrollTop = 0;
    document.querySelectorAll('#grid .sw').forEach((b) => thumb(F.ITEM[b.dataset.id], $('canvas', b)));
    side(SIDE[kind], 600);
    pick(keep && F.ITEM[keep].kind === kind ? keep : S.worn[kind] || items[0].id);
  }

  // Shows a piece on the player without choosing it.
  function preview(id) {
    if (!fig) return;
    const item = F.ITEM[id];
    fig.set(lookWith(id));
    fig.play(item.kind === 'emote' ? id.split('.')[1] : null);
  }

  function pick(id) {
    S.pick = id;
    const item = F.ITEM[id];
    const isEmote = item.kind === 'emote';
    const worn = !isEmote && S.worn[item.kind] === id;
    document.querySelectorAll('#grid .sw').forEach((b) => {
      b.classList.toggle('on', b.dataset.id === id);
      const w = F.ITEM[b.dataset.id];
      const on = w.kind !== 'emote' && S.worn[w.kind] === w.id;
      const badge = $('.worn', b);
      if (on && !badge) b.insertAdjacentHTML('beforeend', `<span class="worn">${icon.check}</span>`);
      if (!on && badge) badge.remove();
    });
    $('#pick').innerHTML = `
      <div class="eyebrow">${KIND[item.kind].label}${item.new ? '<span class="tag new">New</span>' : ''}</div>
      <h1 class="title">${item.name}</h1>
      <p class="about">${item.about}</p>
      <div class="act">${isEmote
        ? '<button class="primary" id="wear">Try it</button>'
        : worn ? `<button class="primary done" id="wear">${icon.check}Wearing</button>` : '<button class="primary" id="wear">Wear it</button>'}
        <p class="note">${isEmote ? 'Hold B in the game to pick one from the wheel.' : 'Everyone with Tailor sees it, on any server.'}</p></div>`;
    $('#wear').addEventListener('click', () => wear());
    preview(id);
  }

  function wear() {
    const item = F.ITEM[S.pick];
    if (item.kind === 'emote') { fig.play(item.id.split('.')[1]); return; }
    S.worn[item.kind] = item.id;
    pick(item.id);
    toast(`Wearing ${item.name}. Everyone with Tailor sees it.`);
  }

  // Squad -------------------------------------------------------------------------------
  function avatar(name, size = 46) {
    const skin = S.skins[name];
    if (!skin) return `<span class="av" title="${name}">${name[0].toUpperCase()}</span>`;
    return `<span class="av face" title="${name}"><img src="${F.faceOf(skin, size * 2).toDataURL()}" alt=""></span>`;
  }

  function squad() {
    const q = S.squad;
    q.members.forEach(loadSkin);
    const names = ['You', ...q.members.slice(1)];
    const el = mount(`
      <section class="squad">
        <div class="card stage crew-card">
          <canvas id="crew"></canvas>
          <button class="quiet" id="edit">Change the cape${icon.chevron}</button>
        </div>
        <div class="squad-info">
          <div class="eyebrow">Your squad</div>
          <h1 class="title">${q.name}</h1>
          <div class="code"><span>${q.code}</span><button id="copy" title="Copy">${icon.copy}</button></div>
          <div class="members">${q.members.map((n) => avatar(n)).join('')}</div>
          <p class="names">${names.slice(0, -1).join(', ')} and ${names.at(-1)}</p>
          <p class="line">Everyone in ${q.name} wears this cape.</p>
          <div class="act"><button class="primary" id="invite">${icon.invite}Invite</button><button class="quiet" id="join">Join another squad</button></div>
        </div>
      </section>`);
    const t0 = performance.now();
    drawCrew(0.6);
    loops.push(setInterval(() => {
      const step = window.tailor.step, t = (performance.now() - t0) / 1000;
      if (!window.tailor.frozen) drawCrew(step ? Math.floor(t / step) * step : t);
    }, 50));
    $('#copy', el).addEventListener('click', () => { navigator.clipboard?.writeText(q.code).catch(() => {}); toast(`Copied ${q.code}`); });
    $('#invite', el).addEventListener('click', () => { navigator.clipboard?.writeText(q.code).catch(() => {}); toast(`Code copied. Friends type ${q.code} in Join another squad.`); });
    $('#join', el).addEventListener('click', () => joinSheet());
    $('#edit', el).addEventListener('click', () => squadSheet());
  }
  // Three of the squad in the squad cape, seen from behind, with name tags.
  function drawCrew(t) {
    const c = $('#crew');
    if (!c) return;
    const [g, w, h] = sized(c);
    g.clearRect(0, 0, w, h);
    const crew = [
      { name: S.squad.members[1], yaw: 216, x: w * 0.22, y: h * 0.8, s: 9.4 },
      { name: S.squad.members[2], yaw: 164, x: w * 0.78, y: h * 0.8, s: 9.4 },
      { name: S.squad.members[0], yaw: 192, x: w * 0.5, y: h * 0.93, s: 10.6 },
    ];
    for (const m of crew) {
      const a = F.render(g, { skin: skinOf(m.name), look: { cape: { squad: S.squad } }, yaw: m.yaw, t: t + m.yaw }, { cx: m.x, cy: m.y, scale: m.s, pitch: 9 });
      tag(g, a.head[0], a.head[1] - 4, m.name === S.me ? 'You' : m.name);
    }
  }
  function tag(g, x, y, text) {
    g.font = '600 12px Inter, sans-serif';
    const w = g.measureText(text).width + 16;
    g.fillStyle = 'rgba(27,26,23,0.62)';
    g.beginPath(); g.roundRect(x - w / 2, y - 22, w, 22, 6); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, x, y - 7);
  }

  const EMBLEM_NAMES = Object.keys(F.EMBLEMS);
  const PALETTE = ['#27324a', '#d9d2c3', '#9e2f2a', '#e4672e', '#f2c230', '#5d7a45', '#1f5f73', '#7a5c8f', '#1b1a17', '#f4f1ea'];
  function emblemSvg(name) {
    const e = F.EMBLEMS[name];
    return `<svg viewBox="0 0 24 24">${e.d ? `<path d="${e.d}" fill="currentColor" fill-rule="evenodd"/>` : ''}${e.s ? `<path d="${e.s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>` : ''}</svg>`;
  }
  function squadSheet() {
    const q = S.squad;
    const draft = { emblem: q.emblem, colors: [...q.colors] };
    const sheet = overlay(`
      <h2>The ${q.name} cape</h2>
      <p class="sub">Pick an emblem and two colours. Everyone in the squad gets the change.</p>
      <div class="sheet-row"><canvas class="sheet-cape" id="draftCape"></canvas>
        <div><div class="emblems" id="emblems">${EMBLEM_NAMES.map((n) => `<button data-e="${n}" title="${n}">${emblemSvg(n)}</button>`).join('')}</div>
        <p class="label">Cape</p><div class="colors" data-slot="0">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}"></button>`).join('')}</div>
        <p class="label">Emblem and band</p><div class="colors" data-slot="1">${PALETTE.map((c) => `<button data-c="${c}" style="background:${c}"></button>`).join('')}</div></div></div>
      <div class="end"><button class="quiet" data-close>Cancel</button><button class="primary" id="save">Save</button></div>`);
    const sync = () => {
      sheet.querySelectorAll('#emblems button').forEach((b) => b.classList.toggle('on', b.dataset.e === draft.emblem));
      sheet.querySelectorAll('.colors').forEach((row) => row.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.c === draft.colors[row.dataset.slot])));
      const [g, w, h] = sized($('#draftCape', sheet));
      g.clearRect(0, 0, w, h);
      g.drawImage(F.squadFace(draft), 0, 0, w, h);
    };
    sync();
    sheet.addEventListener('click', (e) => {
      const em = e.target.closest('#emblems button');
      if (em) draft.emblem = em.dataset.e;
      const col = e.target.closest('.colors button');
      if (col) draft.colors[col.parentElement.dataset.slot] = col.dataset.c;
      if (e.target.closest('#save')) {
        Object.assign(S.squad, draft);
        closeOverlays();
        toast(`Saved. ${S.squad.name} wear the new cape.`);
        return;
      }
      sync();
    });
  }
  function joinSheet() {
    const sheet = overlay(`
      <h2>Join another squad</h2>
      <p class="sub">Type the code a friend gave you. You leave ${S.squad.name}.</p>
      <div class="code" style="margin-top:20px"><span contenteditable="true" id="codeIn" style="min-width:160px;outline:none">&#8203;</span></div>
      <p class="sub" id="codeMsg" style="min-height:20px"></p>
      <div class="end"><button class="quiet" data-close>Cancel</button><button class="primary" id="joinGo">Join</button></div>`);
    $('#joinGo', sheet).addEventListener('click', () => {
      const r = normalizeCode($('#codeIn', sheet).textContent);
      $('#codeMsg', sheet).textContent = r.error || `Joining ${r.code}…`;
    });
  }
  // Same rules as tailor-core's normalize_squad_code.
  function normalizeCode(input) {
    const s = input.replace(/[\s\-_​]/g, '').toUpperCase();
    if (s.length !== 8) return { error: 'A squad code is 4 letters, a dash and 4 characters, like WOLF-7Q2K.' };
    if (!/^[A-Z]{4}$/.test(s.slice(0, 4))) return { error: 'The first 4 must be letters.' };
    const tail = s.slice(4).replace(/[IL]/g, '1').replace(/O/g, '0');
    if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{4}$/.test(tail)) return { error: 'That code has a character squad codes never use.' };
    return { code: `${s.slice(0, 4)}-${tail}` };
  }

  // Make your own -----------------------------------------------------------------------
  const MAX_BYTES = 512 * 1024, MAX_FRAMES = 32;
  // Same rules as tailor-core's fit_cover: the cape's 10:16 shape, as big as the picture allows.
  function fitCover(sw, sh, focus) {
    let w, h;
    if (sw * 256 > 160 * sh) { w = Math.round((sh * 160) / 256); h = sh; } else { w = sw; h = Math.round((sw * 256) / 160); }
    const place = (size, crop, at) => Math.min(Math.max(0, Math.round(Math.min(1, Math.max(0, at)) * size - crop / 2)), size - crop);
    return { x: place(sw, w, focus[0]), y: place(sh, h, focus[1]), w, h };
  }

  function custom() {
    if (!S.custom) {
      const el = mount(`
        <section class="custom">
          <div class="card drop" id="drop">
            <div class="glyph">${icon.picture}</div>
            <h1>Drop a picture or a GIF</h1>
            <p id="dropMsg">PNG, JPG or GIF, up to 512 KB. A GIF makes an animated cape.</p>
            <button class="ghost" id="choose">Choose a file</button>
            <input type="file" id="file" accept="image/png,image/jpeg,image/gif" hidden>
          </div>
        </section>`);
      const zone = $('#drop', el);
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('over'));
      zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('over'); readFile(e.dataTransfer.files[0]); });
      $('#choose', el).addEventListener('click', () => $('#file', el).click());
      $('#file', el).addEventListener('change', (e) => readFile(e.target.files[0]));
      return;
    }
    const c = S.custom;
    const animated = c.frames.length > 1;
    const el = mount(`
      <section class="custom">
        <div class="card source">
          <div class="eyebrow">Your picture</div>
          <div class="photo" id="photo"><canvas id="src"></canvas><div class="crop" id="crop"><i></i><i></i><i></i><i></i><span class="handle">${icon.move}</span></div></div>
          <p class="file">${c.name}${animated ? `<span class="tag">Animated · ${c.frames.length} frames</span>` : ''}</p>
          <p class="hint">Drag the frame to choose the part of the picture you want.</p>
          <button class="quiet" id="again">Use another picture${icon.chevron}</button>
        </div>
        <div class="card stage preview">
          <canvas class="figure" id="fig"></canvas>
          <div class="bar">
            <button class="primary" id="wearCustom">Wear it</button>
            <p class="note">Everyone can see it. Anyone can hide or report it.</p>
          </div>
        </div>
      </section>`);
    fig = new F.Turntable($('#fig', el), { skin: skinOf(S.me), scale: 11, yaw: 196, speed: 9, offsetY: 6, spin: false, idle: 7000 });
    $('#again', el).addEventListener('click', () => { S.custom = null; custom(); });
    $('#wearCustom', el).addEventListener('click', () => { S.worn.cape = null; toast('Wearing your cape. Everyone with Tailor sees it.'); });
    dragCrop($('#crop', el));
    layoutCustom();
  }

  // Places the crop frame and dresses the player; plays a GIF's frames.
  function layoutCustom() {
    const c = S.custom;
    const src = $('#src');
    const [g, w, h] = sized(src);
    g.imageSmoothingEnabled = true;
    const f0 = c.frames[0];
    const crop = fitCover(f0.width, f0.height, c.focus);
    const k = w / f0.width;
    const box = $('#crop');
    box.style.left = `${crop.x * k}px`; box.style.top = `${crop.y * k}px`;
    box.style.width = `${crop.w * k}px`; box.style.height = `${crop.h * k}px`;
    const textures = c.frames.map((f) => F.customTexture(f, crop));
    let i = 0;
    const show = () => {
      g.clearRect(0, 0, w, h);
      g.drawImage(c.frames[i], 0, 0, w, h);
      // Wings would hide the picture, so the preview shows the cape on its own.
      fig.set({ pet: S.worn.pet, cape: { custom: textures[i] } });
    };
    show();
    loops.forEach(clearInterval);
    loops = [];
    if (c.frames.length > 1) loops.push(setInterval(() => { if (!window.tailor.frozen) { i = (i + 1) % c.frames.length; show(); } }, c.delay || 100));
  }

  function dragCrop(box) {
    box.addEventListener('pointerdown', (e) => {
      box.setPointerCapture(e.pointerId);
      const photo = $('#photo').getBoundingClientRect();
      const move = (ev) => { S.custom.focus = [(ev.clientX - photo.left) / photo.width, (ev.clientY - photo.top) / photo.height]; layoutCustom(); };
      box.addEventListener('pointermove', move);
      box.addEventListener('pointerup', () => box.removeEventListener('pointermove', move), { once: true });
    });
  }

  async function readFile(file) {
    const msg = $('#dropMsg');
    if (!file) return;
    if (!/^image\/(png|jpeg|gif)$/.test(file.type)) { msg.textContent = 'Use a PNG, JPG or GIF.'; return; }
    if (file.size > MAX_BYTES) { msg.textContent = `That picture is ${Math.ceil(file.size / 1024)} KB. The limit is 512 KB.`; return; }
    let frames = [], delay = 100;
    if (file.type === 'image/gif' && 'ImageDecoder' in window) {
      const dec = new window.ImageDecoder({ data: await file.arrayBuffer(), type: 'image/gif' });
      await dec.tracks.ready;
      const count = dec.tracks.selectedTrack.frameCount;
      if (count > MAX_FRAMES) { msg.textContent = `That GIF has ${count} frames. Animated capes can have up to 32.`; return; }
      for (let n = 0; n < count; n++) {
        const { image } = await dec.decode({ frameIndex: n });
        delay = (image.duration || 100000) / 1000;
        const cv = document.createElement('canvas');
        cv.width = image.displayWidth; cv.height = image.displayHeight;
        cv.getContext('2d').drawImage(image, 0, 0);
        image.close();
        frames.push(cv);
      }
    } else {
      frames = [await createImageBitmap(file)];
    }
    S.custom = { name: file.name, frames, delay, focus: [0.5, 0.5] };
    custom();
  }

  // First run -------------------------------------------------------------------------
  let firstState = 'add';
  function firstRun() {
    const text = {
      add: ['Add Tailor to Horizon,<br>then open the game once.', 'Add to Horizon', 'Horizon asks you to trust the mod the first time. Its first build can take a while.'],
      waiting: ['Now open Horizon once.<br>Tailor finds you.', null, 'Horizon asks you to trust the mod the first time. Its first build can take a while.'],
      connected: [`<span class="dot"></span>Connected as ${S.me}`, 'Open the wardrobe', 'Your Founder cape is in the wardrobe. It’s yours to keep.'],
    }[firstState];
    const el = mount(`
      <section class="first">
        <canvas id="fig"></canvas>
        <h1>${text[0]}</h1>
        <div class="act">${text[1] ? `<button class="primary" id="firstGo">${text[1]}</button>` : '<button class="ghost" disabled>Waiting for Horizon…</button>'}</div>
        <p class="small">${text[2]}</p>
      </section>`);
    const connected = firstState === 'connected';
    if (connected) loadSkin(S.me);
    fig = new F.Turntable($('#fig', el), { skin: connected ? skinOf(S.me) : F.defaultSkin(), scale: 7.4, base: true, yaw: connected ? 200 : 24, speed: 14, offsetY: 4 });
    fig.set(connected ? { cape: 'cape.founder' } : {});
    $('#firstGo', el)?.addEventListener('click', () => {
      if (firstState === 'add') { firstState = 'waiting'; firstRun(); } else go('wardrobe');
    });
  }

  // Settings and sheets ---------------------------------------------------------------
  function overlay(html) {
    closeOverlays();
    $('#win').insertAdjacentHTML('beforeend', `<div class="scrim" id="scrim"><div class="card sheet">${html}</div></div>`);
    const scrim = $('#scrim');
    scrim.addEventListener('click', (e) => { if (e.target === scrim || e.target.closest('[data-close]')) closeOverlays(); });
    return $('.sheet', scrim);
  }
  function closeOverlays() { $('#scrim')?.remove(); $('#pop')?.remove(); }
  function settings() {
    if ($('#pop')) return closeOverlays();
    closeOverlays();
    $('#win').insertAdjacentHTML('beforeend', `
      <div class="card pop" id="pop">
        <div class="r"><span>Show cosmetics in the game</span><button class="switch ${S.show ? '' : 'off'}" id="showAll"></button></div>
        <div><p class="note" style="margin-bottom:8px">Show custom capes from</p>
          <div class="seg" id="from">${['Everyone', 'Friends and squad', 'Nobody'].map((o) => `<button class="${o === S.customFrom ? 'on' : ''}">${o}</button>`).join('')}</div></div>
        <p class="note">Signed in through Horizon as ${S.me}. Tailor never sees your password.</p>
      </div>`);
    $('#showAll').addEventListener('click', (e) => { S.show = !S.show; e.target.classList.toggle('off', !S.show); });
    $('#from').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      S.customFrom = b.textContent;
      $('#from').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    });
  }

  // Driver for captures ---------------------------------------------------------------
  window.tailor = {
    get fig() { return fig; },
    state: S,
    frozen: false,
    // Seconds each sway pose is held (0: smooth). Captures set it to keep GIFs small.
    step: 0,
    go,
    // Skins we already have, by player name (the captures use our players).
    useSkins(map) { Object.assign(S.skins, map); if (fig) fig.setSkin(skinOf(S.me)); },
    wardrobe(kind = 'cape', id = S.pick) { S.kind = kind; S.pick = id; go('wardrobe'); },
    chip,
    pick,
    hover: preview,
    side,
    wear,
    squad: () => go('squad'),
    // frames: canvases; a single frame for a still picture.
    custom(drop) { S.custom = drop ? { delay: 100, focus: [0.5, 0.5], ...drop } : null; go('custom'); },
    focus(x, y = 0.5) { S.custom.focus = [x, y]; layoutCustom(); },
    first(state = 'add') { firstState = state; go('first'); },
    // Holds the pose (and GIF frames) still, for screenshots.
    freeze(t = 0.6) { this.frozen = true; if (fig) fig.freeze(t); },
    still(yaw) { fig.still(yaw); },
    async press(sel) {
      const b = $(sel);
      b.classList.add('pressed');
      await sleep(160);
      b.classList.remove('pressed');
    },
    async tap(id) {
      const b = $(`.sw[data-id="${id}"]`);
      b.classList.add('tapped');
      await sleep(140);
      b.classList.remove('tapped');
    },
    toast,
    settings,
    sheet(name) { ({ squad: squadSheet, join: joinSheet })[name](); },
    close: closeOverlays,
  };

  go('wardrobe');
})();
