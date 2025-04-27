use mongodb::bson::serde_helpers::serialize_object_id_as_hex_string;
use mongodb::bson::{DateTime, oid::ObjectId};
use once_cell::sync::Lazy;
use regex::Regex;
use serde::de::{self, Deserializer};
use serde::ser::Error as SerError;
use serde::{self, Deserialize, Serializer};

// =============================================================================================================================

pub static LETTERS_REGEX: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$").unwrap());

// =============================================================================================================================

pub fn serialize_option_object_id_as_hex_string<S>(
    id: &Option<ObjectId>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match id {
        Some(oid) => serialize_object_id_as_hex_string(oid, serializer),
        None => serializer.serialize_none(),
    }
}

// =============================================================================================================================

pub fn trim_lowercase<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    Ok(s.trim().to_lowercase())
}

// =============================================================================================================================

pub fn trim<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    Ok(s.trim().to_string())
}

// =============================================================================================================================

pub fn deserialize_object_id<'de, D>(deserializer: D) -> Result<ObjectId, D::Error>
where
    D: Deserializer<'de>,
{
    let s: String = Deserialize::deserialize(deserializer)?;
    ObjectId::parse_str(&s).map_err(de::Error::custom)
}

// =============================================================================================================================

pub fn serialize_option_datetime_as_rfc3339_string<S>(
    date: &Option<DateTime>,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    match date {
        Some(dt) => {
            let s = dt.try_to_rfc3339_string().unwrap();
            serializer.serialize_str(&s)
        }
        None => serializer.serialize_none(),
    }
}

// =============================================================================================================================

pub fn serialize_datetime_as_rfc3339_string<S>(
    date: &DateTime,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    let s = date.try_to_rfc3339_string().map_err(SerError::custom)?;
    serializer.serialize_str(&s)
}

// =============================================================================================================================
