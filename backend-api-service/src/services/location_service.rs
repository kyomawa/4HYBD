use crate::models::{
    location_model::{NearbyUsersQueryParams, UpdateLocationPayload},
    user_model::User,
};
use bson::oid::ObjectId;
use futures_util::TryStreamExt;
use mongodb::{Collection, Database, bson::doc, options::ReturnDocument};
use std::{error::Error, str::FromStr};
use validator::Validate;

// =============================================================================================================================

const USER_COLLECTION: &str = "users";

// =============================================================================================================================

pub async fn update_user_location(
    db: &Database,
    user_id: String,
    payload: UpdateLocationPayload,
) -> Result<User, Box<dyn Error>> {
    payload.validate()?;

    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<User> = db.collection(USER_COLLECTION);

    let filter = doc! {
        "_id": user_id
    };

    let update = doc! {
        "$set": {
            "location": {
                "type": payload.location.location_type,
                "coordinates": payload.location.coordinates.to_vec()
            }
        }
    };

    match collection
        .find_one_and_update(filter, update)
        .return_document(ReturnDocument::After)
        .await?
    {
        Some(user) => Ok(user),
        None => Err("User not found".into()),
    }
}

// =============================================================================================================================

pub async fn find_nearby_users(
    db: &Database,
    user_id: String,
    params: NearbyUsersQueryParams,
) -> Result<Vec<User>, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<User> = db.collection(USER_COLLECTION);

    let radius = params.radius.unwrap_or(5000.0); // Default to 5km
    let limit = params.limit.unwrap_or(50);

    println!(
        "🌍 Searching for users near coordinates: [{}, {}]",
        params.longitude, params.latitude
    );
    println!("📏 Search radius: {} meters", radius);
    println!("👤 Excluding user: {}", user_id);

    let pipeline = vec![
        doc! {
            "$geoNear": {
                "near": {
                    "type": "Point",
                    "coordinates": [params.longitude, params.latitude]
                },
                "distanceField": "distance",
                "maxDistance": radius,
                "spherical": true,
                "query": {
                    "_id": { "$ne": user_id }
                }
            }
        },
        doc! {
            "$limit": limit
        },
    ];

    let mut cursor = collection.aggregate(pipeline).await?;
    let mut users = Vec::new();

    while let Some(result) = cursor.try_next().await? {
        let user: User = bson::from_document(result)?;
        users.push(user);
    }

    println!("✅ Found {} nearby users", users.len());
    Ok(users)
}
// =============================================================================================================================
