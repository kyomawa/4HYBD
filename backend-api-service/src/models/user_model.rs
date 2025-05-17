use crate::utils::utils_fn::{
    LETTERS_REGEX, serialize_option_object_id_as_hex_string, trim, trim_lowercase,
};
use mongodb::bson::{DateTime, oid::ObjectId};
use serde::{Deserialize, Serialize};
use validator::Validate;

// =============================================================================================================================

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum UserRole {
    User,
    Admin,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct User {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_option_object_id_as_hex_string"
    )]
    pub id: Option<ObjectId>,
    pub username: String,
    pub email: String,
    pub password: String,
    pub role: UserRole,
    pub bio: String,
    pub avatar: Option<String>,
    pub created_at: DateTime,
    pub updated_at: DateTime,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct CreateUser {
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
    pub role: UserRole,

    #[serde(deserialize_with = "trim")]
    #[validate(length(
        min = 12,
        max = 32,
        message = "password must be between 12 and 32 characters"
    ))]
    pub bio: String,

    #[validate(url)]
    pub avatar: Option<String>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct UpdateUser {
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
    pub role: UserRole,

    #[serde(deserialize_with = "trim")]
    #[validate(length(
        min = 12,
        max = 32,
        message = "password must be between 12 and 32 characters"
    ))]
    pub bio: String,

    #[validate(url)]
    pub avatar: Option<String>,
}

// =============================================================================================================================
