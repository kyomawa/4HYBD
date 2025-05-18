use crate::utils::utils_fn::serialize_option_object_id_as_hex_string;
use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use validator::Validate;

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct Group {
    #[serde(
        rename = "_id",
        skip_serializing_if = "Option::is_none",
        serialize_with = "serialize_option_object_id_as_hex_string"
    )]
    pub id: Option<ObjectId>,
    pub name: String,
    pub creator_id: ObjectId,
    pub members: Vec<ObjectId>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct CreateGroup {
    #[validate(length(
        min = 3,
        max = 50,
        message = "Group name must be between 3 and 50 characters"
    ))]
    pub name: String,
    pub members: Vec<String>,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct UpdateGroup {
    #[validate(length(
        min = 3,
        max = 50,
        message = "Group name must be between 3 and 50 characters"
    ))]
    pub name: String,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct AddGroupMembers {
    pub members: Vec<String>,
}

// =============================================================================================================================
