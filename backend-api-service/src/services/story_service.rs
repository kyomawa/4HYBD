use crate::{
    models::story_model::{CreateStory, NearbyQueryParams, Story},
    services::file_service,
};
use bson::oid::ObjectId;
use chrono::{Duration, Utc};
use futures_util::TryStreamExt;
use mongodb::{Collection, Database, bson::doc};
use std::{error::Error, str::FromStr};

// =============================================================================================================================

const COLLECTION_NAME: &str = "stories";
const FRIENDS_COLLECTION: &str = "friends";

// =============================================================================================================================

pub async fn get_friend_stories(
    db: &Database,
    user_id: String,
) -> Result<Vec<Story>, Box<dyn Error>> {
    let user_id_obj = ObjectId::from_str(&user_id)?;
    let collection: Collection<Story> = db.collection(COLLECTION_NAME);

    let friends_collection = db.collection::<serde_json::Value>(FRIENDS_COLLECTION);
    let friend_filter = doc! {
        "$or": [
            { "user_id": user_id_obj },
            { "friend_id": user_id_obj }
        ],
        "status": "Accepted"
    };

    let cursor = friends_collection.find(friend_filter).await?;
    let friends = cursor.try_collect::<Vec<serde_json::Value>>().await?;

    let mut friend_ids = Vec::new();
    for friend in friends {
        if let Some(friend_id) = friend.get("user_id").and_then(|id| id.as_str()) {
            if friend_id != user_id {
                if let Ok(id) = ObjectId::from_str(friend_id) {
                    friend_ids.push(id);
                }
            }
        }

        if let Some(friend_id) = friend.get("friend_id").and_then(|id| id.as_str()) {
            if friend_id != user_id {
                if let Ok(id) = ObjectId::from_str(friend_id) {
                    friend_ids.push(id);
                }
            }
        }
    }

    if friend_ids.is_empty() {
        return Ok(Vec::new());
    }

    let now = Utc::now();
    let filter = doc! {
        "user_id": { "$in": friend_ids },
        "expires_at": { "$gt": now }
    };

    let cursor = collection
        .find(filter)
        .sort(doc! { "expires_at": -1 })
        .await?;
    let stories: Vec<Story> = cursor.try_collect().await?;

    Ok(stories)
}

// =============================================================================================================================

pub async fn get_nearby_stories(
    db: &Database,
    user_id: String,
    params: NearbyQueryParams,
) -> Result<Vec<Story>, Box<dyn Error>> {
    let _user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Story> = db.collection(COLLECTION_NAME);

    let radius = params.radius.unwrap_or(5000.0);
    let now = Utc::now();

    let filter = doc! {
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [params.longitude, params.latitude]
                },
                "$maxDistance": radius
            }
        },
        "expires_at": { "$gt": now }
    };

    let cursor = collection
        .find(filter)
        .sort(doc! { "expires_at": -1 })
        .await?;
    let stories: Vec<Story> = cursor.try_collect().await?;

    Ok(stories)
}

// =============================================================================================================================

pub async fn create_story(
    db: &Database,
    user_id: String,
    payload: CreateStory,
) -> Result<Story, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Story> = db.collection(COLLECTION_NAME);

    let expires_at = Utc::now() + Duration::hours(24);

    let story = Story {
        id: None,
        user_id,
        location: payload.location,
        media: payload.media,
        expires_at,
    };

    let result = collection.insert_one(&story).await?;
    let mut created_story = story;
    created_story.id = result.inserted_id.as_object_id();

    Ok(created_story)
}

// =============================================================================================================================

pub async fn get_story_by_id(
    db: &Database,
    story_id: String,
    user_id: String,
) -> Result<Story, Box<dyn Error>> {
    let story_id = ObjectId::from_str(&story_id)?;
    let user_id_obj = ObjectId::from_str(&user_id)?;
    let collection: Collection<Story> = db.collection(COLLECTION_NAME);

    let story = match collection.find_one(doc! { "_id": story_id }).await? {
        Some(story) => story,
        None => return Err("Story not found".into()),
    };

    if story.user_id != user_id_obj {
        let friends_collection = db.collection::<serde_json::Value>(FRIENDS_COLLECTION);
        let friend_filter = doc! {
            "$or": [
                {
                    "user_id": user_id_obj,
                    "friend_id": story.user_id
                },
                {
                    "user_id": story.user_id,
                    "friend_id": user_id_obj
                }
            ],
            "status": "Accepted"
        };

        if (friends_collection.find_one(friend_filter).await?).is_none() {
            let now = Utc::now();
            let distance_filter = doc! {
                "_id": story_id,
                "expires_at": { "$gt": now }
            };

            if (collection.find_one(distance_filter).await?).is_none() {
                return Err("Story not found or you don't have access".into());
            }
        }
    }

    Ok(story)
}

// =============================================================================================================================

pub async fn delete_story(
    db: &Database,
    story_id: String,
    user_id: String,
) -> Result<Story, Box<dyn Error>> {
    let story_id = ObjectId::from_str(&story_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Story> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": story_id,
        "user_id": user_id
    };

    match collection.find_one_and_delete(filter).await? {
        Some(story) => {
            file_service::delete_file(&story.media.url).await?;
            Ok(story)
        }
        None => Err("Story not found or user is not the creator".into()),
    }
}

// =============================================================================================================================
