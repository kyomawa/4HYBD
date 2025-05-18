use crate::utils::utils_fn::serialize_option_object_id_as_hex_string;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

// =============================================================================================================================

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub enum FriendStatus {
    Pending,
    Accepted,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct Friend {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_option_object_id_as_hex_string"
    )]
    pub id: Option<ObjectId>,
    pub status: FriendStatus,
    pub user_id: ObjectId,
    pub friend_id: ObjectId,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct FindFriend {
    pub email: Option<String>,
    pub user_id: Option<String>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct FriendRequest {
    pub user_id: String,
    pub friend_id: String,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct FriendRequestResponse {
    pub id: String,
    pub status: FriendStatus,
}

// =============================================================================================================================
