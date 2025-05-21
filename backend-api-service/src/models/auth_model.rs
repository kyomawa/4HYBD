use crate::utils::utils_fn::{LETTERS_REGEX, trim, trim_lowercase};
use serde::{Deserialize, Serialize};
use validator::Validate;

use super::user_model::Location;

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct AuthLogin {
    pub credential: String,
    pub password: String,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct AuthResponse {
    pub token: String,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct AuthRegister {
    #[serde(deserialize_with = "trim_lowercase")]
    #[validate(length(
        min = 2,
        max = 25,
        message = "username must be between 2 and 25 characters"
    ))]
    #[validate(regex(
        path = "*LETTERS_REGEX",
        message = "username contains invalid characters"
    ))]
    pub username: String,

    #[serde(deserialize_with = "trim_lowercase")]
    #[validate(email(message = "Email must be valid"))]
    pub email: String,

    #[serde(deserialize_with = "trim")]
    #[validate(length(
        min = 12,
        max = 32,
        message = "password must be between 12 and 32 characters"
    ))]
    pub password: String,

    #[serde(deserialize_with = "trim")]
    #[validate(length(
        min = 12,
        max = 32,
        message = "password must be between 12 and 32 characters"
    ))]
    pub bio: String,

    #[validate(url)]
    pub avatar: Option<String>,
    pub location: Location,
}

// =============================================================================================================================
