use crate::models::story_model::Location;
use serde::{Deserialize, Serialize};
use validator::Validate;

// =============================================================================================================================

#[derive(Serialize, Deserialize, Validate)]
pub struct UpdateLocationPayload {
    pub location: Location,
}

// =============================================================================================================================

#[derive(Serialize, Deserialize)]
pub struct NearbyUsersQueryParams {
    pub longitude: f64,
    pub latitude: f64,
    pub radius: Option<f64>,
    pub limit: Option<i64>,
}

// =============================================================================================================================
