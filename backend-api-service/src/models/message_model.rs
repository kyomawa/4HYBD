use crate::utils::utils_fn::serialize_option_object_id_as_hex_string;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

// =============================================================================================================================

#[derive(Debug, Serialize, Deserialize)]
pub enum MediaType {
    Image,
    Video,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct Media {
    pub media_type: MediaType,
    #[validate(url)]
    pub url: String,
    pub duration: Option<f64>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct Message {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_option_object_id_as_hex_string"
    )]
    pub id: Option<ObjectId>,
    pub content: String,
    pub sender_id: ObjectId,
    pub recipient_id: ObjectId,
    pub is_group: bool,
    pub media: Option<Media>,
    pub read: bool,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct CreateMessage {
    #[validate(length(
        max = 1000,
        message = "Message content must be less than 1000 characters"
    ))]
    pub content: String,
    pub media: Option<Media>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct MessageQueryParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// =============================================================================================================================
