use crate::{
    models::message_model::Media, utils::utils_fn::serialize_option_object_id_as_hex_string,
};
use chrono::{DateTime, Utc};
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct Location {
    #[serde(rename = "type")]
    pub location_type: String,
    pub coordinates: [f64; 2],
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct Story {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_option_object_id_as_hex_string"
    )]
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub location: Location,
    pub media: Media,
    pub expires_at: DateTime<Utc>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct CreateStory {
    pub media: Media,
    pub location: Location,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct NearbyQueryParams {
    pub latitude: f64,
    pub longitude: f64,
    pub radius: Option<f64>,
}

// =============================================================================================================================
