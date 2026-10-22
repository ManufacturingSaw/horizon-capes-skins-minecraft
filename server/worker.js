// Tailor's free server: sign-in, who wears what, squads, custom capes and emote rooms.
// One Cloudflare Worker on the free plan: D1 for the tables, R2 for pictures and
// one Durable Object class for emote rooms. Anyone can run a mirror of it.

const EMOTES = ['wave', 'dance', 'sit', 'point', 'clap', 'bow', 'facepalm', 'gg'];
const SLOTS = ['cape', 'wings', 'hat', 'pet'];
const PIECE = /^(cape|wings|hat|pet)\.[a-z0-9-]{1,24}$/;
const PLAYER = /^[0-9a-f]{32}$/;
const MAX_LOOK = 100;
const MAX_BYTES = 512 * 1024;
const MAX_FRAMES = 32;
const HIDE_AFTER = 3;
const DAY = 86400;
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const HAS_JOINED = 'https://sessionserver.mojang.com/session/minecraft/hasJoined';

const now = () => Math.floor(Date.now() / 1000);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });
const fail = (status, error) => json({ error }, status);

async function hmac(env, text) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SIGNING_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

// Minecraft's server hash: SHA-1 read as a signed number, in hex (tailor-core's server_id_hash).
async function serverIdHash(id) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(id)));
  const negative = d[0] & 0x80;
  if (negative) {
    let carry = 1;
    for (let i = d.length - 1; i >= 0; i--) { const v = (~d[i] & 0xff) + carry; d[i] = v & 0xff; carry = v >> 8; }
  }
  const digits = hex(d).replace(/^0+/, '') || '0';
  return negative ? `-${digits}` : digits;
}

// Tokens are `<player id>.<expiry>.<signature>`; nothing is stored for them.
async function who(env, token) {
  const [id, exp, sig] = (token || '').split('.');
  if (!PLAYER.test(id || '') || !(+exp > now())) return null;
  return sig === (await hmac(env, `token|${id}|${exp}`)) ? id : null;
}

// Sign-in ------------------------------------------------------------------------

// A nonce the mod turns into a session-server join. Signed, so nothing is stored.
async function hello(env, url) {
  const name = url.searchParams.get('name') || '';
  if (!/^\w{3,16}$/.test(name)) return fail(400, 'name');
  const t = now();
  return json({ nonce: `${t.toString(36)}${(await hmac(env, `hello|${name}|${t}`)).slice(0, 12)}` });
}

async function login(env, req) {
  const { name, nonce } = await req.json();
  const t = parseInt((nonce || '').slice(0, -12), 36);
  if (!(now() - t < 120) || nonce.slice(-12) !== (await hmac(env, `hello|${name}|${t}`)).slice(0, 12)) return fail(403, 'nonce');
  // The game has just joined "server" hash(nonce) with its own token. Mojang confirms it.
  const q = new URLSearchParams({ username: name, serverId: await serverIdHash(nonce) });
  const res = await fetch(`${HAS_JOINED}?${q}`);
  if (res.status !== 200) return fail(403, 'not signed in to Minecraft');
  const profile = await res.json();
  await env.DB.prepare('INSERT INTO players (id, name, first_seen) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO UPDATE SET name = ?2')
    .bind(profile.id, profile.name, now()).run();
  const first = await env.DB.prepare('SELECT first_seen FROM players WHERE id = ?').bind(profile.id).first('first_seen');
  const exp = now() + 30 * DAY;
  const token = `${profile.id}.${exp}.${await hmac(env, `token|${profile.id}|${exp}`)}`;
  return json({ token, id: profile.id, name: profile.name, founder: first < Date.parse(env.FOUNDER_UNTIL) / 1000 });
}

// Looks ----------------------------------------------------------------------------

// Up to 100 players in one request, cached for 5 minutes at the edge.
async function look(env, req, ctx) {
  const cache = caches.default;
  const hit = await cache.match(req);
  if (hit) return hit;
  const ids = (new URL(req.url).searchParams.get('ids') || '').split(',').filter((id) => PLAYER.test(id)).slice(0, MAX_LOOK);
  if (!ids.length) return json({});
  const rows = await env.DB.prepare(
    `SELECT p.id, p.squad, w.cape, w.wings, w.hat, w.pet, c.hidden FROM players p
     LEFT JOIN wearing w ON w.player = p.id
     LEFT JOIN capes c ON w.cape = 'custom:' || c.id
     WHERE p.id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all();
  const out = {};
  for (const r of rows.results) {
    let cape = r.cape;
    if (cape === 'squad') cape = r.squad ? `squad:${r.squad}` : null;
    if (r.hidden) cape = null; // reported by 3 players: hidden until reviewed
    out[r.id] = { cape, wings: r.wings, hat: r.hat, pet: r.pet, squad: r.squad };
  }
  const res = json(out, 200, { 'cache-control': 'public, max-age=300' });
  ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}

async function wear(env, req, me) {
  const body = await req.json();
  const pick = {};
  for (const slot of SLOTS) {
    const v = body[slot] ?? null;
    const ok = v === null || PIECE.test(v) && v.startsWith(slot) || slot === 'cape' && (v === 'squad' || /^custom:[0-9a-f]{20}$/.test(v));
    if (!ok) return fail(400, slot);
    pick[slot] = v;
  }
  if (pick.cape?.startsWith('custom:')) {
    const owner = await env.DB.prepare('SELECT owner FROM capes WHERE id = ?').bind(pick.cape.slice(7)).first('owner');
    if (owner !== me) return fail(403, 'not your cape');
  }
  await env.DB.prepare(
    `INSERT INTO wearing (player, cape, wings, hat, pet, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(player) DO UPDATE SET cape = ?2, wings = ?3, hat = ?4, pet = ?5, updated = ?6`)
    .bind(me, pick.cape, pick.wings, pick.hat, pick.pet, now()).run();
  return json(pick);
}

// Squads ---------------------------------------------------------------------------

// Same rules as tailor-core: 4 letters, a dash, 4 Crockford base32 characters.
const prefix = (word) => (word.toUpperCase().replace(/[^A-Z]/g, '') + 'XXXX').slice(0, 4);
function normalize(code) {
  const s = String(code || '').replace(/[\s\-_]/g, '').toUpperCase();
  const tail = s.slice(4).replace(/[IL]/g, '1').replace(/O/g, '0');
  return /^[A-Z]{4}$/.test(s.slice(0, 4)) && new RegExp(`^[${CROCKFORD}]{4}$`).test(tail) && s.length === 8 ? `${s.slice(0, 4)}-${tail}` : null;
}

async function makeSquad(env, req, me) {
  const { name, word, emblem, colors } = await req.json();
  if (!/^.{2,24}$/.test(name || '') || !/^[a-z]{3,10}$/.test(emblem || '') || !colors?.every((c) => /^#[0-9a-f]{6}$/i.test(c))) return fail(400, 'squad');
  const n = crypto.getRandomValues(new Uint32Array(1))[0] & 0xfffff;
  const code = `${prefix(word || name)}-${[15, 10, 5, 0].map((s) => CROCKFORD[(n >> s) & 31]).join('')}`;
  await env.DB.batch([
    env.DB.prepare('INSERT INTO squads (code, name, emblem, color1, color2, owner, created) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(code, name, emblem, colors[0], colors[1], me, now()),
    env.DB.prepare('UPDATE players SET squad = ? WHERE id = ?').bind(code, me),
  ]);
  return json({ code });
}

async function joinSquad(env, req, me) {
  const code = normalize((await req.json()).code);
  const squad = code && (await env.DB.prepare('SELECT name FROM squads WHERE code = ?').bind(code).first());
  if (!squad) return fail(404, 'no squad with that code');
  await env.DB.prepare('UPDATE players SET squad = ? WHERE id = ?').bind(code, me).run();
  return json({ code, name: squad.name });
}

async function squadInfo(env, code) {
  const s = await env.DB.prepare('SELECT name, emblem, color1, color2 FROM squads WHERE code = ?').bind(code).first();
  if (!s) return fail(404, 'no squad with that code');
  const members = await env.DB.prepare('SELECT name FROM players WHERE squad = ? ORDER BY first_seen').bind(code).all();
  return json({ code, name: s.name, emblem: s.emblem, colors: [s.color1, s.color2], members: members.results.map((r) => r.name) });
}

// Only the squad's maker changes its cape; everyone in the squad sees the change.
async function editSquad(env, req, code, me) {
  const { emblem, colors } = await req.json();
  if (!/^[a-z]{3,10}$/.test(emblem || '') || !colors?.every((c) => /^#[0-9a-f]{6}$/i.test(c))) return fail(400, 'squad');
  const r = await env.DB.prepare('UPDATE squads SET emblem = ?, color1 = ?, color2 = ? WHERE code = ? AND owner = ?').bind(emblem, colors[0], colors[1], code, me).run();
  return r.meta.changes ? squadInfo(env, code) : fail(403, 'only the squad maker can change the cape');
}

// Custom capes ---------------------------------------------------------------------

function sniff(b) {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'gif';
  return null;
}
// Frames in a GIF: one graphic control block (21 F9 04) per frame.
const gifFrames = (b) => { let n = 0; for (let i = 0; i < b.length - 2; i++) if (b[i] === 0x21 && b[i + 1] === 0xf9 && b[i + 2] === 0x04) n++; return Math.max(1, n); };

async function upload(env, req, me) {
  const bytes = new Uint8Array(await req.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return fail(415, 'Use a PNG, JPG or GIF.');
  if (bytes.length > MAX_BYTES) return fail(413, 'The limit is 512 KB.');
  if (kind === 'gif' && gifFrames(bytes) > MAX_FRAMES) return fail(413, 'Animated capes can have up to 32 frames.');
  const id = hex(await crypto.subtle.digest('SHA-256', bytes)).slice(0, 20);
  await env.PICTURES.put(`capes/${id}`, bytes, { httpMetadata: { contentType: `image/${kind}` } });
  await env.DB.prepare('INSERT OR IGNORE INTO capes (id, owner, kind, bytes, created) VALUES (?, ?, ?, ?, ?)').bind(id, me, kind, bytes.length, now()).run();
  return json({ cape: `custom:${id}` });
}

async function picture(env, key, hidden = false) {
  if (hidden) return fail(404, 'hidden');
  const obj = await env.PICTURES.get(key);
  if (!obj) return fail(404, 'not found');
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'image/png', 'cache-control': 'public, max-age=86400' } });
}

async function report(env, id, me) {
  await env.DB.prepare('INSERT OR IGNORE INTO reports (cape, reporter, created) VALUES (?, ?, ?)').bind(id, me, now()).run();
  const n = await env.DB.prepare('SELECT COUNT(DISTINCT reporter) AS n FROM reports WHERE cape = ?').bind(id).first('n');
  if (n >= HIDE_AFTER) await env.DB.prepare('UPDATE capes SET hidden = 1 WHERE id = ?').bind(id).run();
  return json({ reports: n, hidden: n >= HIDE_AFTER });
}

// Routing --------------------------------------------------------------------------

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname;
    const me = await who(env, (req.headers.get('authorization') || '').replace(/^Bearer /, '') || url.searchParams.get('token'));
    const m = (re) => path.match(re);
    const signedIn = (fn) => (me ? fn() : fail(401, 'sign in through the game first'));
    try {
      if (req.method === 'GET' && path === '/v1/hello') return hello(env, url);
      if (req.method === 'POST' && path === '/v1/login') return login(env, req);
      if (req.method === 'GET' && path === '/v1/look') return look(env, req, ctx);
      if (req.method === 'PUT' && path === '/v1/wear') return signedIn(() => wear(env, req, me));
      if (req.method === 'POST' && path === '/v1/squads') return signedIn(() => makeSquad(env, req, me));
      if (req.method === 'POST' && path === '/v1/squads/join') return signedIn(() => joinSquad(env, req, me));
      if (req.method === 'POST' && path === '/v1/capes') return signedIn(() => upload(env, req, me));
      let g;
      if ((g = m(/^\/v1\/squads\/([A-Z]{4}-[0-9A-Z]{4})$/))) return req.method === 'PUT' ? signedIn(() => editSquad(env, req, g[1], me)) : squadInfo(env, g[1]);
      if ((g = m(/^\/v1\/capes\/([0-9a-f]{20})\/report$/)) && req.method === 'POST') return signedIn(() => report(env, g[1], me));
      if ((g = m(/^\/v1\/capes\/([0-9a-f]{20})$/))) {
        const hidden = await env.DB.prepare('SELECT hidden FROM capes WHERE id = ?').bind(g[1]).first('hidden');
        return picture(env, `capes/${g[1]}`, hidden === 1);
      }
      // Art for the catalog's pieces, uploaded to R2 under art/ when the server is set up.
      if ((g = m(/^\/v1\/art\/([a-z]+\.[a-z0-9-]+)$/))) return picture(env, `art/${g[1]}`);
      if ((g = m(/^\/v1\/emotes\/(-?[0-9a-f]{1,40})$/))) {
        if (req.headers.get('upgrade') !== 'websocket') return fail(426, 'websocket');
        return signedIn(() => env.ROOMS.get(env.ROOMS.idFromName(g[1])).fetch(new Request(req, { headers: { ...Object.fromEntries(req.headers), 'x-player': me } })));
      }
      return fail(404, 'not found');
    } catch (e) {
      return fail(500, String(e.message || e));
    }
  },
};

// Emote rooms: one per Minecraft server address (by hash). The WebSocket
// Hibernation API keeps idle rooms free; nothing is stored.
export class EmoteRoom {
  constructor(ctx) {
    this.ctx = ctx;
  }
  async fetch(req) {
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server, [req.headers.get('x-player')]);
    return new Response(null, { status: 101, webSocket: client });
  }
  webSocketMessage(ws, message) {
    let emote;
    try { emote = JSON.parse(message).emote; } catch { return; }
    if (!EMOTES.includes(emote)) return;
    const [id] = this.ctx.getTags(ws);
    const out = JSON.stringify({ id, emote });
    for (const peer of this.ctx.getWebSockets()) if (peer !== ws) peer.send(out);
  }
  webSocketClose(ws, code) {
    ws.close(code, 'bye');
  }
}
