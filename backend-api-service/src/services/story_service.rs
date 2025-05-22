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

    let now = Utc::now();

    let pipeline = vec![
        doc! {
            "$lookup": {
                "from": "friends",
                "let": { "storyUserId": "$user_id" },
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    { "$eq": ["$status", "Accepted"] },
                                    {
                                        "$or": [
                                            {
                                                "$and": [
                                                    { "$eq": ["$user_id", user_id_obj] },
                                                    { "$eq": ["$friend_id", "$$storyUserId"] }
                                                ]
                                            },
                                            {
                                                "$and": [
                                                    { "$eq": ["$friend_id", user_id_obj] },
                                                    { "$eq": ["$user_id", "$$storyUserId"] }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                ],
                "as": "friendship"
            }
        },
        doc! {
            "$match": {
                "friendship": { "$ne": [] },
                "expires_at": { "$gt": now }
            }
        },
        doc! {
            "$unset": "friendship"
        },
        doc! {
            "$sort": {
                "expires_at": -1
            }
        },
        doc! {
            "$limit": 100
        },
    ];

    let mut cursor = collection.aggregate(pipeline).await?;
    let mut stories = Vec::new();

    while let Some(result) = cursor.try_next().await? {
        let story: Story = bson::from_document(result)?;
        stories.push(story);
    }

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
                    "expires_at": { "$gt": now }
                }
            }
        },
        doc! {
            "$sort": {
                "distance": 1,  // Trier par distance croissante
                "expires_at": -1 // Puis par date décroissante
            }
        },
        doc! {
            "$limit": 50  // Limiter le nombre de résultats
        },
    ];

    let mut cursor = collection.aggregate(pipeline).await?;
    let mut stories = Vec::new();

    while let Some(result) = cursor.try_next().await? {
        let story: Story = bson::from_document(result)?;
        stories.push(story);
    }

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
