//! The parts of Tailor that have to be exactly right, shared by the app and the
//! mod: the login hash, squad codes, fitting a picture to a cape, the catalog
//! and the rule that hides a reported cape.

use std::collections::HashSet;
use std::fmt;

use serde::Deserialize;
use sha1::{Digest, Sha1};

// Login hash ------------------------------------------------------------------

/// Minecraft's server hash: the SHA-1 of the server id, read as a signed
/// (two's-complement) big integer and printed in hex with no leading zeros and
/// a `-` when negative, like Java's `new BigInteger(digest).toString(16)`.
///
/// The mod sends this to the session server's `join`, and the Tailor server
/// sends the same value to `hasJoined`, so both sides must agree to the bit.
pub fn server_id_hash(server_id: &str) -> String {
    // Java encodes the id as ISO-8859-1, with `?` for anything outside it.
    let bytes: Vec<u8> = server_id
        .chars()
        .map(|c| u8::try_from(u32::from(c)).unwrap_or(b'?'))
        .collect();
    let mut digest: [u8; 20] = Sha1::digest(&bytes).into();
    let negative = digest[0] & 0x80 != 0;
    if negative {
        // Negate: invert every bit, then add one.
        let mut carry = true;
        for b in digest.iter_mut().rev() {
            *b = !*b;
            if carry {
                let (v, overflow) = b.overflowing_add(1);
                *b = v;
                carry = overflow;
            }
        }
    }
    let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    let digits = match hex.trim_start_matches('0') {
        "" => "0",
        d => d,
    };
    if negative {
        format!("-{digits}")
    } else {
        digits.to_string()
    }
}

// Squad codes -----------------------------------------------------------------

/// Crockford's base32: digits and letters without I, L, O and U.
const CROCKFORD: &[u8; 32] = b"0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/// Why a typed squad code was refused.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CodeError {
    /// Not 4 letters and 4 characters once spaces and dashes are taken out.
    Length,
    /// The first part has something other than A to Z.
    Letters,
    /// The second part has a character Crockford's base32 doesn't use.
    Characters,
}

impl fmt::Display for CodeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            CodeError::Length => {
                "A squad code is 4 letters, a dash and 4 characters, like WOLF-7Q2K."
            }
            CodeError::Letters => "The first 4 must be letters.",
            CodeError::Characters => "That code has a character squad codes never use.",
        })
    }
}

impl std::error::Error for CodeError {}

/// The 4 letters a squad code starts with: the first 4 letters A to Z of a
/// word, padded with X. By default the word is the squad's name; a squad may
/// pick its own word instead ("Wolves" chose "Wolf").
pub fn squad_prefix(word: &str) -> String {
    let mut letters: String = word
        .chars()
        .filter(char::is_ascii_alphabetic)
        .map(|c| c.to_ascii_uppercase())
        .take(4)
        .collect();
    while letters.len() < 4 {
        letters.push('X');
    }
    letters
}

/// A squad code from its word and a 20-bit number, e.g. `WOLF-7Q2K`.
pub fn squad_code(word: &str, number: u32) -> String {
    let mut tail = [0u8; 4];
    for (i, slot) in tail.iter_mut().enumerate() {
        let shift = 5 * (3 - i);
        *slot = CROCKFORD[((number >> shift) & 31) as usize];
    }
    format!("{}-{}", squad_prefix(word), String::from_utf8_lossy(&tail))
}

/// Turns what a friend typed into a code, or says why it isn't one.
/// `wolf 7q2k` becomes `WOLF-7Q2K`; in the last 4, I and L read as 1 and O as 0.
pub fn normalize_squad_code(input: &str) -> Result<String, CodeError> {
    let chars: Vec<char> = input
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-' && *c != '_')
        .map(|c| c.to_ascii_uppercase())
        .collect();
    if chars.len() != 8 {
        return Err(CodeError::Length);
    }
    let (head, tail) = chars.split_at(4);
    if !head.iter().all(char::is_ascii_uppercase) {
        return Err(CodeError::Letters);
    }
    let mut out: String = head.iter().collect();
    out.push('-');
    for &c in tail {
        let c = match c {
            'I' | 'L' => '1',
            'O' => '0',
            c => c,
        };
        if !c.is_ascii() || !CROCKFORD.contains(&(c as u8)) {
            return Err(CodeError::Characters);
        }
        out.push(c);
    }
    Ok(out)
}

// Custom capes ----------------------------------------------------------------

/// A cape's face is 10:16. Pictures are fitted to it at 160 × 256.
pub const CAPE_W: u32 = 160;
pub const CAPE_H: u32 = 256;
/// The biggest picture the server takes.
pub const MAX_CAPE_BYTES: usize = 512 * 1024;
/// The most frames an animated cape may have.
pub const MAX_CAPE_FRAMES: u32 = 32;

/// The part of the source picture that ends up on the cape, in source pixels.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

/// Fills the cape with the picture (cover, never stretched): the crop has the
/// cape's shape, is as big as the picture allows and sits as close to `focus`
/// as it can. `focus` is where the player dragged the crop to, from (0, 0) at
/// the top left to (1, 1) at the bottom right; (0.5, 0.5) is centred.
pub fn fit_cover(src_w: u32, src_h: u32, dst_w: u32, dst_h: u32, focus: (f64, f64)) -> CropRect {
    let (sw, sh, dw, dh) = (src_w as u64, src_h as u64, dst_w as u64, dst_h as u64);
    let (w, h) = if sw * dh > dw * sh {
        // The picture is wider than the cape: keep its full height.
        (((sh * dw) as f64 / dh as f64).round() as u32, src_h)
    } else {
        (src_w, ((sw * dh) as f64 / dw as f64).round() as u32)
    };
    let (w, h) = (w.clamp(1, src_w.max(1)), h.clamp(1, src_h.max(1)));
    let place = |size: u32, crop: u32, at: f64| -> u32 {
        let centre = at.clamp(0.0, 1.0) * size as f64;
        let start = (centre - crop as f64 / 2.0).round();
        start.clamp(0.0, (size - crop) as f64) as u32
    };
    CropRect {
        x: place(src_w, w, focus.0),
        y: place(src_h, h, focus.1),
        w,
        h,
    }
}

/// The picture formats a cape can be made from.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageKind {
    Png,
    Jpeg,
    Gif,
}

impl ImageKind {
    /// Reads the format from the file's first bytes, not from its name.
    pub fn sniff(bytes: &[u8]) -> Option<ImageKind> {
        if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
            Some(ImageKind::Png)
        } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
            Some(ImageKind::Jpeg)
        } else if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
            Some(ImageKind::Gif)
        } else {
            None
        }
    }
}

/// Why a picture can't become a cape.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UploadError {
    NotAPicture,
    TooBig { bytes: usize },
    TooManyFrames { frames: u32 },
}

impl fmt::Display for UploadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            UploadError::NotAPicture => f.write_str("Use a PNG, JPG or GIF."),
            UploadError::TooBig { bytes } => {
                write!(
                    f,
                    "That picture is {} KB. The limit is 512 KB.",
                    bytes.div_ceil(1024)
                )
            }
            UploadError::TooManyFrames { frames } => {
                write!(
                    f,
                    "That GIF has {frames} frames. Animated capes can have up to 32."
                )
            }
        }
    }
}

impl std::error::Error for UploadError {}

/// Checks a picture before it's sent: its format, its size and, for a GIF, how
/// many frames it has.
pub fn check_upload(bytes: &[u8], frames: u32) -> Result<ImageKind, UploadError> {
    let kind = ImageKind::sniff(bytes).ok_or(UploadError::NotAPicture)?;
    if bytes.len() > MAX_CAPE_BYTES {
        return Err(UploadError::TooBig { bytes: bytes.len() });
    }
    if frames > MAX_CAPE_FRAMES {
        return Err(UploadError::TooManyFrames { frames });
    }
    Ok(kind)
}

// Reports ---------------------------------------------------------------------

/// A custom cape is hidden for everyone once this many different players have
/// reported it, until a volunteer reviews it.
pub const HIDE_AFTER_REPORTS: usize = 3;

/// Whether a cape with these reports (one player id per report) is hidden.
/// The same player reporting twice counts once.
pub fn hidden_by_reports<S: AsRef<str>>(reporters: &[S]) -> bool {
    let distinct: HashSet<&str> = reporters.iter().map(AsRef::as_ref).collect();
    distinct.len() >= HIDE_AFTER_REPORTS
}

// Catalog ---------------------------------------------------------------------

/// What a piece is.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Cape,
    Wings,
    Hat,
    Pet,
    Emote,
}

impl Kind {
    pub const ALL: [Kind; 5] = [Kind::Cape, Kind::Wings, Kind::Hat, Kind::Pet, Kind::Emote];

    /// How ids of this kind start, e.g. `cape.` in `cape.ember`.
    pub fn id_prefix(self) -> &'static str {
        match self {
            Kind::Cape => "cape",
            Kind::Wings => "wings",
            Kind::Hat => "hat",
            Kind::Pet => "pet",
            Kind::Emote => "emote",
        }
    }
}

/// One piece in the wardrobe.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Item {
    pub id: String,
    pub name: String,
    pub kind: Kind,
    /// The one line the app shows under the name.
    #[serde(default)]
    pub about: String,
    #[serde(default)]
    pub colors: Vec<String>,
    #[serde(default)]
    pub motif: Option<String>,
    /// Shows a "New" tag.
    #[serde(default)]
    pub new: bool,
}

/// Everything in `catalog/cosmetics.toml`.
#[derive(Debug, Clone, PartialEq, Deserialize)]
pub struct Catalog {
    #[serde(rename = "item")]
    pub items: Vec<Item>,
}

/// Why the catalog file was refused.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CatalogError {
    Toml(String),
    DuplicateId(String),
    /// The id doesn't start with its kind, like `hat.ember` for a cape.
    WrongPrefix(String),
    BadColor {
        id: String,
        color: String,
    },
}

impl fmt::Display for CatalogError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CatalogError::Toml(e) => write!(f, "cosmetics.toml: {e}"),
            CatalogError::DuplicateId(id) => write!(f, "cosmetics.toml: {id} is listed twice"),
            CatalogError::WrongPrefix(id) => {
                write!(f, "cosmetics.toml: {id} doesn't start with its kind")
            }
            CatalogError::BadColor { id, color } => {
                write!(
                    f,
                    "cosmetics.toml: {id} has {color}, which isn't a #rrggbb colour"
                )
            }
        }
    }
}

impl std::error::Error for CatalogError {}

impl Catalog {
    /// Reads the catalog and checks that ids are unique, start with their
    /// kind and that every colour is `#rrggbb`.
    pub fn parse(text: &str) -> Result<Catalog, CatalogError> {
        let catalog: Catalog =
            toml::from_str(text).map_err(|e| CatalogError::Toml(e.to_string()))?;
        let mut seen = HashSet::new();
        for item in &catalog.items {
            if !seen.insert(item.id.as_str()) {
                return Err(CatalogError::DuplicateId(item.id.clone()));
            }
            let prefix = format!("{}.", item.kind.id_prefix());
            if !item.id.starts_with(&prefix) || item.id.len() == prefix.len() {
                return Err(CatalogError::WrongPrefix(item.id.clone()));
            }
            for color in &item.colors {
                let ok = color.len() == 7
                    && color.starts_with('#')
                    && color[1..].chars().all(|c| c.is_ascii_hexdigit());
                if !ok {
                    return Err(CatalogError::BadColor {
                        id: item.id.clone(),
                        color: color.clone(),
                    });
                }
            }
        }
        Ok(catalog)
    }

    /// The pieces of one kind, in catalog order.
    pub fn of(&self, kind: Kind) -> impl Iterator<Item = &Item> {
        self.items.iter().filter(move |i| i.kind == kind)
    }

    pub fn get(&self, id: &str) -> Option<&Item> {
        self.items.iter().find(|i| i.id == id)
    }
}

// Tests -----------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    const CATALOG: &str = include_str!("../../../catalog/cosmetics.toml");

    #[test]
    fn server_hash_matches_minecraft() {
        assert_eq!(
            server_id_hash("Notch"),
            "4ed1f46bbe04bc756bcb17c0c7ce3e4632f06a48"
        );
        assert_eq!(
            server_id_hash("jeb_"),
            "-7c9d5b0044c130109a5d7b5fb5c317c02b4e28c1"
        );
        // A digest that starts with a zero nibble loses it, like Java's BigInteger.
        assert_eq!(
            server_id_hash("simon"),
            "88e16a1019277b15d58faf0541e11910eb756f6"
        );
    }

    #[test]
    fn squad_prefix_takes_four_letters() {
        assert_eq!(squad_prefix("Wolves"), "WOLV");
        assert_eq!(squad_prefix("Wolf"), "WOLF");
        assert_eq!(squad_prefix("kai's 2 builds"), "KAIS");
        assert_eq!(squad_prefix("Ox"), "OXXX");
        assert_eq!(squad_prefix("42"), "XXXX");
    }

    #[test]
    fn squad_code_round_trips() {
        let n = 7 * 32 * 32 * 32 + 23 * 32 * 32 + 2 * 32 + 19;
        assert_eq!(squad_code("Wolf", n), "WOLF-7Q2K");
        assert_eq!(squad_code("Moss", 0), "MOSS-0000");
        assert_eq!(squad_code("Moss", (1 << 20) - 1), "MOSS-ZZZZ");
    }

    #[test]
    fn typed_codes_are_normalized() {
        assert_eq!(
            normalize_squad_code("wolf 7q2k").as_deref(),
            Ok("WOLF-7Q2K")
        );
        assert_eq!(
            normalize_squad_code(" WOLF-7Q2K ").as_deref(),
            Ok("WOLF-7Q2K")
        );
        // I and L read as 1 and O as 0 in the last part, never in the letters.
        assert_eq!(
            normalize_squad_code("wolf-ilo2").as_deref(),
            Ok("WOLF-1102")
        );
        assert_eq!(normalize_squad_code("wolf-7q2"), Err(CodeError::Length));
        assert_eq!(normalize_squad_code("w0lf-7q2k"), Err(CodeError::Letters));
        assert_eq!(
            normalize_squad_code("wolf-7q2u"),
            Err(CodeError::Characters)
        );
        assert_eq!(
            normalize_squad_code("wolf-7q2é"),
            Err(CodeError::Characters)
        );
    }

    #[test]
    fn wide_pictures_keep_their_height() {
        let c = fit_cover(1600, 900, CAPE_W, CAPE_H, (0.5, 0.5));
        assert_eq!((c.w, c.h), (563, 900));
        assert_eq!((c.x, c.y), (519, 0));
        assert_eq!(fit_cover(1600, 900, CAPE_W, CAPE_H, (0.0, 0.5)).x, 0);
        assert_eq!(
            fit_cover(1600, 900, CAPE_W, CAPE_H, (1.0, 0.5)).x,
            1600 - 563
        );
    }

    #[test]
    fn tall_pictures_keep_their_width() {
        let c = fit_cover(400, 1000, CAPE_W, CAPE_H, (0.5, 0.2));
        assert_eq!((c.w, c.h), (400, 640));
        assert_eq!((c.x, c.y), (0, 0));
        let c = fit_cover(400, 1000, CAPE_W, CAPE_H, (0.5, 0.5));
        assert_eq!(c.y, 180);
        // Already the cape's shape: the whole picture.
        assert_eq!(
            fit_cover(320, 512, CAPE_W, CAPE_H, (0.9, 0.9)),
            CropRect {
                x: 0,
                y: 0,
                w: 320,
                h: 512
            }
        );
    }

    #[test]
    fn uploads_are_checked() {
        let png = b"\x89PNG\r\n\x1a\n rest".to_vec();
        assert_eq!(check_upload(&png, 1), Ok(ImageKind::Png));
        assert_eq!(
            check_upload(&[0xFF, 0xD8, 0xFF, 0xE0], 1),
            Ok(ImageKind::Jpeg)
        );
        assert_eq!(check_upload(b"GIF89a....", 32), Ok(ImageKind::Gif));
        assert_eq!(
            check_upload(b"GIF89a....", 33),
            Err(UploadError::TooManyFrames { frames: 33 })
        );
        assert_eq!(check_upload(b"<svg/>", 1), Err(UploadError::NotAPicture));
        let mut big = png.clone();
        big.resize(MAX_CAPE_BYTES + 1, 0);
        assert_eq!(
            check_upload(&big, 1),
            Err(UploadError::TooBig {
                bytes: MAX_CAPE_BYTES + 1
            })
        );
        big.truncate(MAX_CAPE_BYTES);
        assert!(check_upload(&big, 1).is_ok());
    }

    #[test]
    fn three_different_reporters_hide_a_cape() {
        assert!(!hidden_by_reports(&["mossy", "kai_builds"]));
        assert!(!hidden_by_reports(&[
            "mossy",
            "mossy",
            "mossy",
            "kai_builds"
        ]));
        assert!(hidden_by_reports(&["mossy", "kai_builds", "Lumen"]));
        assert!(!hidden_by_reports::<&str>(&[]));
    }

    #[test]
    fn catalog_has_every_piece() {
        let c = Catalog::parse(CATALOG).unwrap();
        let count = |k| c.of(k).count();
        assert_eq!(count(Kind::Cape), 24);
        assert_eq!(count(Kind::Wings), 8);
        assert_eq!(count(Kind::Hat), 12);
        assert_eq!(count(Kind::Pet), 6);
        assert_eq!(count(Kind::Emote), 8);
        assert_eq!(c.get("cape.ember").map(|i| i.name.as_str()), Some("Ember"));
        assert_eq!(c.get("wings.moth").map(|i| i.kind), Some(Kind::Wings));
        assert!(c.get("cape.founder").is_some());
        for kind in Kind::ALL {
            assert!(c.of(kind).all(|i| i.id.starts_with(kind.id_prefix())));
        }
        assert!(c.items.iter().all(|i| !i.about.is_empty()));
    }

    #[test]
    fn catalog_mistakes_are_caught() {
        let twice = "[[item]]\nid = \"cape.a\"\nname = \"A\"\nkind = \"cape\"\n".repeat(2);
        assert_eq!(
            Catalog::parse(&twice),
            Err(CatalogError::DuplicateId("cape.a".into()))
        );
        let wrong = "[[item]]\nid = \"hat.a\"\nname = \"A\"\nkind = \"cape\"\n";
        assert_eq!(
            Catalog::parse(wrong),
            Err(CatalogError::WrongPrefix("hat.a".into()))
        );
        let color =
            "[[item]]\nid = \"cape.a\"\nname = \"A\"\nkind = \"cape\"\ncolors = [\"orange\"]\n";
        assert!(matches!(
            Catalog::parse(color),
            Err(CatalogError::BadColor { .. })
        ));
        assert!(matches!(
            Catalog::parse("[[item]]\nid = 3\n"),
            Err(CatalogError::Toml(_))
        ));
    }
}
