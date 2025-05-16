use serde::{Deserialize, Serialize};
use validator::Validate;

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
