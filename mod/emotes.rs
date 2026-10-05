//! Tailor's mod, part two: the emote wheel and emotes from other players.
//!
//! Hold B for the wheel, let go on an emote. Your game tells the Tailor server,
//! which passes it to other Tailor players on the same server address. The
//! address itself is never sent, only a hash of it, and nothing goes to the
//! Minecraft server. If the Tailor server is down, you still see your own emote.

use std::collections::HashMap;
use std::net::TcpStream;
use std::sync::mpsc::{Sender, channel};
use std::sync::{Mutex, OnceLock};
use std::time::Instant;

// verify: tungstenite (with rustls) is in Horizon's Cargo.lock at the pinned revision.
use tungstenite::{Message, WebSocket, stream::MaybeTlsStream};

/// Clockwise from the top, as on the wheel and in the catalog.
pub const EMOTES: [&str; 8] = ["wave", "dance", "sit", "point", "clap", "bow", "facepalm", "gg"];
/// How long each emote plays, in seconds.
const LENGTH: [f32; 8] = [2.0, 4.0, 6.0, 2.0, 2.5, 2.0, 2.0, 2.5];
/// The B key (GLFW key code).
const KEY_B: i32 = 66;

#[derive(Default)]
struct Wheel {
    open: bool,
    /// Pointer travel since the wheel opened; its direction picks the emote.
    dx: f32,
    dy: f32,
    room: Option<String>,
    out: Option<Sender<String>>,
    /// Who is emoting: player id → (emote, since).
    playing: HashMap<String, (String, Instant)>,
}

fn wheel() -> &'static Mutex<Wheel> {
    static WHEEL: OnceLock<Mutex<Wheel>> = OnceLock::new();
    WHEEL.get_or_init(|| Mutex::new(Wheel::default()))
}

/// The emote a player is playing now, if any. Used by cosmetics.rs to pose the model.
pub fn playing(id: &str) -> Option<(String, Instant)> {
    let w = wheel().lock().unwrap();
    let (emote, since) = w.playing.get(id)?;
    let i = EMOTES.iter().position(|e| e == emote)?;
    (since.elapsed().as_secs_f32() < LENGTH[i]).then(|| (emote.clone(), *since))
}

/// Which slice the pointer is in: 0 at the top, clockwise. None near the middle.
pub fn slice(dx: f32, dy: f32) -> Option<usize> {
    if dx * dx + dy * dy < 30.0 * 30.0 {
        return None;
    }
    let turn = dx.atan2(-dy).to_degrees().rem_euclid(360.0);
    Some(((turn + 22.5) / 45.0) as usize % 8)
}

pub fn tailor_key(game: &mut crate::game::Game<'_>) {
    // verify: the key hook's event fields (key code, pressed or released) and pointer delta.
    let Some(ev) = game.native_key_event() else { return };
    let mut w = wheel().lock().unwrap();
    if ev.key == KEY_B && ev.pressed && !game.native_screen_open() {
        w.open = true;
        (w.dx, w.dy) = (0.0, 0.0);
    } else if ev.key == KEY_B && !ev.pressed && w.open {
        w.open = false;
        if let Some(i) = slice(w.dx, w.dy) {
            play(&mut w, game, EMOTES[i]);
        }
    }
    if w.open {
        let (mx, my) = game.native_mouse_delta();
        (w.dx, w.dy) = (w.dx + mx, w.dy + my);
    }
}

pub fn tailor_hud(game: &mut crate::game::Game<'_>) {
    let mut w = wheel().lock().unwrap();
    join_room(&mut w, game);
    if !w.open {
        return;
    }
    // verify: the HUD's drawing helpers (filled arc, text) and the GUI size.
    let (gw, gh) = game.native_gui_size();
    let (cx, cy) = (gw as f32 / 2.0, gh as f32 / 2.0);
    let hover = slice(w.dx, w.dy);
    for (i, emote) in EMOTES.iter().enumerate() {
        let start = i as f32 * 45.0 - 22.5 + 1.6;
        let fill = if hover == Some(i) { 0xff2f5bd3 } else { 0xe6fffdf8 };
        game.native_arc(cx, cy, 34.0, 84.0, start, start + 41.8, fill);
        let a = (i as f32 * 45.0).to_radians();
        let ink = if hover == Some(i) { 0xffffffff } else { 0xff1b1a17 };
        game.native_text_centered(label(emote), cx + a.sin() * 59.0, cy - a.cos() * 59.0, ink);
    }
    let middle = hover.map_or("Emotes", |i| label(EMOTES[i]));
    game.native_text_centered(middle, cx, cy - 4.0, 0xffffffff);
}

fn label(emote: &str) -> &'static str {
    match emote {
        "wave" => "Wave",
        "dance" => "Dance",
        "sit" => "Sit",
        "point" => "Point",
        "clap" => "Clap",
        "bow" => "Bow",
        "facepalm" => "Facepalm",
        _ => "GG",
    }
}

fn play(w: &mut Wheel, game: &crate::game::Game<'_>, emote: &str) {
    if let Some(me) = game.native_player() {
        w.playing.insert(me.uuid.simple().to_string(), (emote.to_string(), Instant::now()));
    }
    if let Some(out) = &w.out {
        let _ = out.send(emote.to_string());
    }
}

/// One emote room per server address. Rejoins when the address changes.
fn join_room(w: &mut Wheel, game: &crate::game::Game<'_>) {
    // verify: the address of the server being played ("host:port"; None in single player),
    // and the module path horizon-mixins gives cosmetics.rs.
    let room = game.native_server_address().map(|a| crate::tailor_cosmetics::server_id_hash(&format!("tailor-room:{}", a.to_lowercase())));
    if room == w.room {
        return;
    }
    w.room = room.clone();
    w.out = None;
    let (Some(room), Some(token)) = (room, session_token()) else { return };
    let (tx, rx) = channel::<String>();
    w.out = Some(tx);
    std::thread::spawn(move || {
        let url = format!("wss://tailor.ManufacturingSaw.workers.dev/v1/emotes/{room}?token={token}");
        let Ok((mut ws, _)) = tungstenite::connect(url.as_str()) else { return };
        set_nonblocking(&mut ws);
        loop {
            while let Ok(emote) = rx.try_recv() {
                if ws.send(Message::text(format!(r#"{{"emote":"{emote}"}}"#))).is_err() {
                    return;
                }
            }
            match ws.read() {
                Ok(Message::Text(t)) => heard(&t),
                Ok(Message::Close(_)) => return,
                Ok(_) => {}
                Err(tungstenite::Error::Io(e)) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                }
                Err(_) => return,
            }
        }
    });
}

/// `{"id":"…","emote":"wave"}` from another player in the room.
fn heard(text: &str) {
    let Ok(v) = serde_json::from_str::<serde_json::Value>(text) else { return };
    let (Some(id), Some(emote)) = (v["id"].as_str(), v["emote"].as_str()) else { return };
    if EMOTES.contains(&emote) {
        wheel().lock().unwrap().playing.insert(id.to_string(), (emote.to_string(), Instant::now()));
    }
}

fn session_token() -> Option<String> {
    let path = crate::game::Game::native_config_dir().join("tailor").join("session.json");
    let v: serde_json::Value = serde_json::from_str(&std::fs::read_to_string(path).ok()?).ok()?;
    v["token"].as_str().map(str::to_string)
}

fn set_nonblocking(ws: &mut WebSocket<MaybeTlsStream<TcpStream>>) {
    let stream: &TcpStream = match ws.get_ref() {
        MaybeTlsStream::Plain(s) => s,
        MaybeTlsStream::Rustls(s) => s.get_ref(),
        _ => return,
    };
    let _ = stream.set_nonblocking(true);
}
