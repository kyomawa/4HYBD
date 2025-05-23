use std::env;

use actix_web::{HttpRequest, HttpResponse, http::header};
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};

use crate::{models::user_model::UserRole, utils::api_response::ApiResponse};

// =============================================================================================================================

pub static JWT_EXTERNAL_SIGNATURE: Lazy<Vec<u8>> = Lazy::new(|| {
    let secret_str = env::var("JWT_SIGNATURE").expect("JWT_SIGNATURE not set");
    secret_str.into_bytes()
});

// =============================================================================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct ExternalClaims {
    pub user_id: String,
    pub role: UserRole,
    pub exp: i64,
}

// =============================================================================================================================

pub fn encode_external_jwt(user_id: String, role: UserRole) -> Result<String, String> {
    let signature = JWT_EXTERNAL_SIGNATURE.as_slice();
    let claims = ExternalClaims {
        user_id,
        role,
        exp: (Utc::now() + Duration::minutes(60)).timestamp(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(signature),
    )
    .map_err(|e| e.to_string())
}

// =============================================================================================================================

pub fn decode_external_jwt(token: &str) -> Result<ExternalClaims, String> {
    let signature = JWT_EXTERNAL_SIGNATURE.as_slice();
    decode::<ExternalClaims>(
        token,
        &DecodingKey::from_secret(signature),
        &Validation::default(),
    )
    .map(|data| data.claims)
    .map_err(|e| e.to_string())
}

// =============================================================================================================================

pub fn get_external_jwt(req: &HttpRequest) -> Result<ExternalClaims, String> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .ok_or("Missing Authorization header")?;

    let auth_str = auth_header.to_str().map_err(|_| "Invalid header string")?;

    let token = auth_str
        .strip_prefix("Bearer ")
        .ok_or("Invalid token format, expected Bearer")?;

    decode_external_jwt(token)
}

// =============================================================================================================================

pub fn get_authenticated_user(req: &HttpRequest) -> Result<ExternalClaims, HttpResponse> {
    match get_external_jwt(req) {
        Ok(user) => Ok(user),
        Err(e) => {
            let response = ApiResponse::error("The user must be authenticated.", e);
            Err(HttpResponse::Unauthorized().json(response))
        }
    }
}

// =============================================================================================================================

pub fn user_has_any_of_these_roles(
    req: &HttpRequest,
    roles: &[UserRole],
) -> Result<ExternalClaims, HttpResponse> {
    let jwt_payload = get_authenticated_user(req)?;

    if roles.contains(&jwt_payload.role) {
        Ok(jwt_payload)
    } else {
        let response = ApiResponse::error(
            "Access denied: insufficient role",
            Some("User role is not allowed"),
        );
        Err(HttpResponse::Unauthorized().json(response))
    }
}

// =============================================================================================================================
