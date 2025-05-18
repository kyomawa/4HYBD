use crate::models::{
    friend_model::{Friend, FriendStatus},
    user_model::User,
};
use bson::oid::ObjectId;
use futures_util::TryStreamExt;
use mongodb::{Collection, Database, bson::doc, options::ReturnDocument};
use std::{error::Error, str::FromStr};

// =============================================================================================================================

const COLLECTION_NAME: &str = "friends";
const USER_COLLECTION_NAME: &str = "users";

// =============================================================================================================================

pub async fn get_friends(db: &Database, user_id: String) -> Result<Vec<User>, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Friend> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "$or": [
            { "user_id": user_id },
            { "friend_id": user_id }
        ],
        "status": "Accepted"
    };

    let friends = collection.find(filter).await?;
    let friend_docs: Vec<Friend> = friends.try_collect().await?;

    let user_collection: Collection<User> = db.collection(USER_COLLECTION_NAME);
    let mut result = Vec::new();

    for friend in friend_docs {
        let friend_id = if friend.user_id == user_id {
            friend.friend_id
        } else {
            friend.user_id
        };
        if let Some(user) = user_collection.find_one(doc! { "_id": friend_id }).await? {
            result.push(user);
        }
    }

    Ok(result)
}

// =============================================================================================================================

pub async fn get_friend_requests(
    db: &Database,
    user_id: String,
) -> Result<Vec<Friend>, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Friend> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "friend_id": user_id,
        "status": "Pending"
    };

    let requests = collection.find(filter).await?;
    let result: Vec<Friend> = requests.try_collect().await?;

    Ok(result)
}

// =============================================================================================================================

pub async fn find_user_by_email(db: &Database, email: String) -> Result<User, Box<dyn Error>> {
    let collection: Collection<User> = db.collection(USER_COLLECTION_NAME);

    match collection.find_one(doc! { "email": email }).await? {
        Some(user) => Ok(user),
        None => Err("No user found with the given email".into()),
    }
}

// =============================================================================================================================

pub async fn find_user_by_id(db: &Database, user_id: String) -> Result<User, Box<dyn Error>> {
    let collection: Collection<User> = db.collection(USER_COLLECTION_NAME);
    let id = ObjectId::from_str(&user_id)?;

    match collection.find_one(doc! { "_id": id }).await? {
        Some(user) => Ok(user),
        None => Err("No user found with the given id".into()),
    }
}

// =============================================================================================================================

pub async fn send_friend_request(
    db: &Database,
    user_id: String,
    friend_id: String,
) -> Result<Friend, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let friend_id = ObjectId::from_str(&friend_id)?;

    if user_id == friend_id {
        return Err("Cannot send friend request to yourself".into());
    }

    let collection: Collection<Friend> = db.collection(COLLECTION_NAME);

    let existing_filter = doc! {
        "$or": [
            { "user_id": user_id, "friend_id": friend_id },
            { "user_id": friend_id, "friend_id": user_id }
        ]
    };

    if (collection.find_one(existing_filter).await?).is_some() {
        return Err("Friend request already exists or users are already friends".into());
    }

    let friend = Friend {
        id: None,
        status: FriendStatus::Pending,
        user_id,
        friend_id,
    };

    let result = collection.insert_one(&friend).await?;
    let mut created_friend = friend;
    created_friend.id = result.inserted_id.as_object_id();

    Ok(created_friend)
}

// =============================================================================================================================

pub async fn accept_friend_request(
    db: &Database,
    request_id: String,
    user_id: String,
) -> Result<Friend, Box<dyn Error>> {
    let request_id = ObjectId::from_str(&request_id)?;
    let user_id = ObjectId::from_str(&user_id)?;

    let collection: Collection<Friend> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": request_id,
        "friend_id": user_id,
        "status": "Pending"
    };

    let update = doc! {
        "$set": {
            "status": "Accepted"
        }
    };

    match collection
        .find_one_and_update(filter, update)
        .return_document(ReturnDocument::After)
        .await?
    {
        Some(friend) => Ok(friend),
        None => Err("Friend request not found or already accepted".into()),
    }
}

// =============================================================================================================================

pub async fn delete_friend(
    db: &Database,
    user_id: String,
    friend_id: String,
) -> Result<Friend, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let friend_id = ObjectId::from_str(&friend_id)?;

    let collection: Collection<Friend> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "$or": [
            { "user_id": user_id, "friend_id": friend_id },
            { "user_id": friend_id, "friend_id": user_id }
        ]
    };

    match collection.find_one_and_delete(filter).await? {
        Some(friend) => Ok(friend),
        None => Err("Friend relationship not found".into()),
    }
}

// =============================================================================================================================
