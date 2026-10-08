//! Tailor's mod, part one: signing in, finding out who wears what, and drawing it.
//!
//! Compiled into the game by horizon-mixins. Cosmetics are drawn on this screen
//! only. Nothing here talks to the Minecraft server, and the game's login token
//! never leaves the game: the session server only learns that this player asked
//! to join "server" <hash>, and Tailor's server checks exactly that.
//!
//! Calls into the game that couldn't be checked against the pinned revision are
//! marked `verify:`. They are kept to the small `game_*` functions at the end.

use std::collections::{HashMap, HashSet};
use std::sync::mpsc::{Receiver, Sender, channel};
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

/// Tailor servers, tried in order. Players can add mirrors in config/tailor.toml.
const DEFAULT_SERVER: &str = "https://tailor.ManufacturingSaw.workers.dev";
/// One look-up asks about up to this many players. The server caches it for 5 minutes.
const BATCH: usize = 100;
const KEEP_LOOK: Duration = Duration::from_secs(300);
const SEND_EVERY: Duration = Duration::from_secs(2);

/// What one player wears. Ids come from catalog/cosmetics.toml; a custom cape
/// is `custom:<id>`, a squad cape `squad:<code>`.
#[derive(Clone, Default)]
pub struct Look {
    pub cape: Option<String>,
    pub wings: Option<String>,
    pub hat: Option<String>,
    pub pet: Option<String>,
    pub squad: Option<String>,
}

enum Reply {
    SignedIn { token: String },
    Looks(Vec<(String, Look)>),
    Failed(String),
}

struct State {
    servers: Vec<String>,
    show: bool,
    /// Custom capes from "everyone", "squad" (friends and squad) or "nobody".
    custom_from: String,
    me: Option<String>,
    token: Option<String>,
    signing_in: bool,
    looks: HashMap<String, (Look, Instant)>,
    asked: HashSet<String>,
    queue: Vec<String>,
    last_send: Instant,
    tx: Sender<Reply>,
    rx: Receiver<Reply>,
}

fn state() -> &'static Mutex<State> {
    static STATE: OnceLock<Mutex<State>> = OnceLock::new();
    STATE.get_or_init(|| {
        let (tx, rx) = channel();
        let config = read_config();
        Mutex::new(State {
            servers: config.0,
            show: config.1,
            custom_from: config.2,
            me: None,
            token: None,
            signing_in: false,
            looks: HashMap::new(),
            asked: HashSet::new(),
            queue: Vec::new(),
            last_send: Instant::now(),
            tx,
            rx,
        })
    })
}

/// config/tailor.toml, which the app writes:
/// `servers = [...]`, `show = true|false`, `custom_from = "everyone"|"squad"|"nobody"`.
fn read_config() -> (Vec<String>, bool, String) {
    let path = crate::game::Game::native_config_dir().join("tailor.toml");
    let text = std::fs::read_to_string(path).unwrap_or_default();
    let mut servers = Vec::new();
    let mut show = true;
    let mut custom_from = "everyone".to_string();
    for line in text.lines() {
        let Some((key, value)) = line.split_once('=') else { continue };
        match key.trim() {
            "servers" => servers = value.split('"').skip(1).step_by(2).map(str::to_string).collect(),
            "show" => show = value.trim() != "false",
            "custom_from" => custom_from = value.trim().trim_matches('"').to_string(),
            _ => {}
        }
    }
    if servers.is_empty() {
        servers.push(DEFAULT_SERVER.to_string());
    }
    (servers, show, custom_from)
}

/// Once a frame. Cheap: it only moves work to and from the network thread.
pub fn tailor_frame(game: &mut crate::game::Game<'_>) {
    let mut s = state().lock().unwrap();
    while let Ok(reply) = s.rx.try_recv() {
        match reply {
            Reply::SignedIn { token } => {
                s.token = Some(token);
                s.signing_in = false;
            }
            Reply::Looks(list) => {
                let now = Instant::now();
                for (id, look) in list {
                    s.looks.insert(id, (look, now));
                }
            }
            Reply::Failed(why) => {
                s.signing_in = false;
                eprintln!("tailor: {why}");
            }
        }
    }
    if s.token.is_none() && !s.signing_in {
        if let Some((name, uuid)) = game_profile(game) {
            s.signing_in = true;
            s.me = Some(uuid.clone());
            let (servers, tx) = (s.servers.clone(), s.tx.clone());
            std::thread::spawn(move || sign_in(&servers, &name, &uuid, &tx));
        }
        return;
    }
    // Ask about players in view we know nothing (fresh) about.
    let now = Instant::now();
    for id in game_players_in_view(game) {
        let fresh = s.looks.get(&id).is_some_and(|(_, at)| now - *at < KEEP_LOOK);
        if !fresh && s.asked.insert(id.clone()) {
            s.queue.push(id);
        }
    }
    if !s.queue.is_empty() && (s.queue.len() >= BATCH || now - s.last_send >= SEND_EVERY) {
        let ids: Vec<String> = s.queue.drain(..s.queue.len().min(BATCH)).collect();
        for id in &ids {
            s.asked.remove(id);
        }
        s.last_send = now;
        let (servers, tx) = (s.servers.clone(), s.tx.clone());
        std::thread::spawn(move || look_up(&servers, &ids, &tx));
    }
}

/// The login every Minecraft server uses, pointed at Tailor's server instead:
/// get a nonce, have the game join "server" hash(nonce) with Mojang, and let
/// Tailor's server ask Mojang's `hasJoined` whether that happened.
fn sign_in(servers: &[String], name: &str, uuid: &str, tx: &Sender<Reply>) {
    for server in servers {
        let attempt = (|| -> Result<String, String> {
            let hello = http("GET", &format!("{server}/v1/hello?name={name}"), None)?;
            let nonce = json_str(&hello, "nonce")?;
            game_join_session(&server_id_hash(&nonce))?;
            let body = format!(r#"{{"name":"{name}","id":"{uuid}","nonce":"{nonce}"}}"#);
            let reply = http("POST", &format!("{server}/v1/login"), Some(body))?;
            let token = json_str(&reply, "token")?;
            // The app reads this to know who you are. It holds Tailor's token only.
            let dir = crate::game::Game::native_config_dir().join("tailor");
            let _ = std::fs::create_dir_all(&dir);
            let _ = std::fs::write(dir.join("session.json"), &reply);
            Ok(token)
        })();
        match attempt {
            Ok(token) => return drop(tx.send(Reply::SignedIn { token })),
            Err(e) => eprintln!("tailor: {server}: {e}"),
        }
    }
    let _ = tx.send(Reply::Failed("no Tailor server answered; capes show from cache".into()));
}

fn look_up(servers: &[String], ids: &[String], tx: &Sender<Reply>) {
    let url = |s: &String| format!("{s}/v1/look?ids={}", ids.join(","));
    let Some(body) = servers.iter().find_map(|s| http("GET", &url(s), None).ok()) else {
        return drop(tx.send(Reply::Failed("look-up failed".into())));
    };
    let Ok(serde_json::Value::Object(map)) = serde_json::from_str(&body) else { return };
    let field = |v: &serde_json::Value, k: &str| v.get(k).and_then(|x| x.as_str()).map(str::to_string);
    let list = map
        .iter()
        .map(|(id, v)| {
            let look = Look { cape: field(v, "cape"), wings: field(v, "wings"), hat: field(v, "hat"), pet: field(v, "pet"), squad: field(v, "squad") };
            (id.clone(), look)
        })
        .collect();
    let _ = tx.send(Reply::Looks(list));
}

/// After a player's model is drawn: their Tailor pieces, posed with the model.
pub fn tailor_player(player: &crate::render::entity::player::PlayerRenderState, out: &mut crate::render::EntityBuffers) {
    let s = state().lock().unwrap();
    if !s.show {
        return;
    }
    let Some((look, _)) = s.looks.get(&player.uuid.simple().to_string()) else { return };
    let my_squad = s.me.as_ref().and_then(|me| s.looks.get(me)).and_then(|(l, _)| l.squad.clone());
    for piece in [&look.cape, &look.wings, &look.hat, &look.pet].into_iter().flatten() {
        // "Show custom capes from": hidden custom capes never reach here; the server leaves them out.
        if piece.starts_with("custom:") {
            let friend = look.squad.is_some() && look.squad == my_squad;
            if s.custom_from == "nobody" || (s.custom_from == "squad" && !friend) {
                continue;
            }
        }
        // Art comes from the Tailor server once and is kept in the game's cache.
        // verify: the entity buffer call for a textured part attached to a model bone.
        out.native_cosmetic(player, piece, &format!("{}/v1/art/{piece}", s.servers[0]));
    }
    // verify: the module path horizon-mixins gives emotes.rs, and posing the model's arms.
    if let Some((emote, since)) = crate::tailor_emotes::playing(&player.uuid.simple().to_string()) {
        out.native_pose(player, &emote, since.elapsed().as_secs_f32());
    }
    if let Some(squad) = &look.squad {
        // verify: the name tag's second line.
        out.native_name_suffix(player, squad);
    }
}

/// Skips the vanilla cape for players who wear a Tailor cape.
pub fn tailor_skip_cape(player: &crate::render::entity::player::PlayerRenderState) -> bool {
    let s = state().lock().unwrap();
    s.show && s.looks.get(&player.uuid.simple().to_string()).is_some_and(|(l, _)| l.cape.is_some())
}

/// Minecraft's server hash, as in tailor-core: SHA-1, signed, in hex.
pub fn server_id_hash(server_id: &str) -> String {
    // verify: horizon_protocol::crypto::server_hash's arguments (id, secret, key).
    horizon_protocol::crypto::server_hash(server_id, &[], &[])
}

fn json_str(body: &str, key: &str) -> Result<String, String> {
    let v: serde_json::Value = serde_json::from_str(body).map_err(|e| e.to_string())?;
    v.get(key).and_then(|x| x.as_str()).map(str::to_string).ok_or_else(|| format!("no {key} in reply"))
}

// The game -------------------------------------------------------------------

/// This player's name and id, once the launcher has signed them in.
fn game_profile(game: &crate::game::Game<'_>) -> Option<(String, String)> {
    // verify: where the signed-in profile lives on Game.
    game.native_player().map(|p| (p.name.clone(), p.uuid.simple().to_string()))
}

fn game_players_in_view(game: &crate::game::Game<'_>) -> Vec<String> {
    // verify: the list of other players the client is tracking.
    game.native_players().iter().map(|p| p.uuid.simple().to_string()).collect()
}

/// The session service's `join`, made by the game with the token it holds.
fn game_join_session(hash: &str) -> Result<(), String> {
    // verify: auth.rs's join call outside a server handshake.
    crate::auth::join_server(hash).map_err(|e| e.to_string())
}

fn http(method: &str, url: &str, body: Option<String>) -> Result<String, String> {
    // verify: the HTTPS client the game uses for skins (ureq at the pinned lock).
    let req = ureq::request(method, url).timeout(Duration::from_secs(8));
    let res = match body {
        Some(b) => req.set("content-type", "application/json").send_string(&b),
        None => req.call(),
    };
    res.map_err(|e| e.to_string())?.into_string().map_err(|e| e.to_string())
}
