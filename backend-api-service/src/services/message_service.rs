use crate::{
    models::message_model::{CreateMessage, Message, MessageQueryParams},
    services::file_service,
};
use bson::oid::ObjectId;
use futures_util::TryStreamExt;
use mongodb::{Collection, Database, bson::doc};
use std::{error::Error, str::FromStr};
use validator::Validate;

// =============================================================================================================================

const COLLECTION_NAME: &str = "messages";
const GROUPS_COLLECTION: &str = "groups";
const FRIENDS_COLLECTION: &str = "friends";

// =============================================================================================================================

pub async fn get_direct_messages(
    db: &Database,
    user_id: String,
    recipient_id: String,
    params: MessageQueryParams,
) -> Result<Vec<Message>, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let recipient_id = ObjectId::from_str(&recipient_id)?;
    let collection: Collection<Message> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "is_group": false,
        "$or": [
            {
                "sender_id": user_id,
                "recipient_id": recipient_id
            },
            {
                "sender_id": recipient_id,
                "recipient_id": user_id
            }
        ]
    };

    let limit = params.limit.unwrap_or(50);
    let skip = params.offset.unwrap_or(0);

    let cursor = collection
        .find(filter)
        .sort(doc! { "_id": -1 })
        .limit(limit)
        .skip(skip as u64)
        .await?;
    let messages: Vec<Message> = cursor.try_collect().await?;

    Ok(messages)
}

// =============================================================================================================================

pub async fn get_group_messages(
    db: &Database,
    user_id: String,
    group_id: String,
    params: MessageQueryParams,
) -> Result<Vec<Message>, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let group_id = ObjectId::from_str(&group_id)?;
    let collection: Collection<Message> = db.collection(COLLECTION_NAME);

    let groups_collection = db.collection::<serde_json::Value>(GROUPS_COLLECTION);
    let group_filter = doc! {
        "_id": group_id,
        "members": user_id
    };

    if (groups_collection.find_one(group_filter).await?).is_none() {
        return Err("Group not found or user is not a member".into());
    }

    let filter = doc! {
        "is_group": true,
        "recipient_id": group_id
    };

    let limit = params.limit.unwrap_or(50);
    let skip = params.offset.unwrap_or(0);

    let cursor = collection
        .find(filter)
        .sort(doc! { "_id": -1 })
        .limit(limit)
        .skip(skip as u64)
        .await?;
    let messages: Vec<Message> = cursor.try_collect().await?;

    Ok(messages)
}

// =============================================================================================================================

pub async fn send_direct_message(
    db: &Database,
    user_id: String,
    recipient_id: String,
    payload: CreateMessage,
) -> Result<Message, Box<dyn Error>> {
    payload.validate()?;

    let user_id = ObjectId::from_str(&user_id)?;
    let recipient_id = ObjectId::from_str(&recipient_id)?;

    if user_id == recipient_id {
        return Err("Cannot send message to yourself".into());
    }

    let friends_collection = db.collection::<serde_json::Value>(FRIENDS_COLLECTION);
    let friend_filter = doc! {
        "$or": [
            {
                "user_id": user_id,
                "friend_id": recipient_id
            },
            {
                "user_id": recipient_id,
                "friend_id": user_id
            }
        ],
        "status": "Accepted"
    };

    if (friends_collection.find_one(friend_filter).await?).is_none() {
        return Err("Recipient is not in your friends list".into());
    }

    let collection: Collection<Message> = db.collection(COLLECTION_NAME);

    let message = Message {
        id: None,
        content: payload.content,
        sender_id: user_id,
        recipient_id,
        is_group: false,
        media: payload.media,
        read: false,
    };

    let result = collection.insert_one(&message).await?;
    let mut created_message = message;
    created_message.id = result.inserted_id.as_object_id();

    Ok(created_message)
}

// =============================================================================================================================

pub async fn send_group_message(
    db: &Database,
    user_id: String,
    group_id: String,
    payload: CreateMessage,
) -> Result<Message, Box<dyn Error>> {
    payload.validate()?;

    let user_id = ObjectId::from_str(&user_id)?;
    let group_id = ObjectId::from_str(&group_id)?;

    let groups_collection = db.collection::<serde_json::Value>(GROUPS_COLLECTION);
    let group_filter = doc! {
        "_id": group_id,
        "members": user_id
    };

    if (groups_collection.find_one(group_filter).await?).is_none() {
        return Err("Group not found or user is not a member".into());
    }

    let collection: Collection<Message> = db.collection(COLLECTION_NAME);

    let message = Message {
        id: None,
        content: payload.content,
        sender_id: user_id,
        recipient_id: group_id,
        is_group: true,
        media: payload.media,
        read: true,
    };

    let result = collection.insert_one(&message).await?;
    let mut created_message = message;
    created_message.id = result.inserted_id.as_object_id();

    Ok(created_message)
}

// =============================================================================================================================

pub async fn delete_message(
    db: &Database,
    message_id: String,
    user_id: String,
) -> Result<Message, Box<dyn Error>> {
    let message_id = ObjectId::from_str(&message_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Message> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": message_id,
        "sender_id": user_id
    };

    match collection.find_one_and_delete(filter).await? {
        Some(message) => {
            if let Some(media) = &message.media {
                file_service::delete_file(&media.url).await?;
            }
            Ok(message)
        }
        None => Err("Message not found or user is not the sender".into()),
    }
}

// =============================================================================================================================
