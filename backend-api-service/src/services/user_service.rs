use crate::models::user_model::{CreateUser, UpdateUser, User};
use bcrypt::{DEFAULT_COST, hash};
use bson::{oid::ObjectId, to_document};
use futures_util::TryStreamExt;
use mongodb::{Collection, Cursor, Database, bson::doc, options::ReturnDocument};
use std::{error::Error, str::FromStr};
use validator::Validate;

// =============================================================================================================================

const COLLECTION_NAME: &str = "users";

// =============================================================================================================================

pub async fn get_users(db: &Database) -> Result<Vec<User>, Box<dyn Error>> {
    let collection: Collection<User> = db.collection(COLLECTION_NAME);
    let cursor: Cursor<User> = collection.find(doc! {}).await?;
    let users: Vec<User> = cursor.try_collect().await?;
    Ok(users)
}

// =============================================================================================================================

pub async fn get_user_by_id(db: &Database, id: String) -> Result<User, Box<dyn Error>> {
    let id = ObjectId::from_str(&id)?;
    let collection: Collection<User> = db.collection(COLLECTION_NAME);
    let filter = doc! {
      "_id": id
    };
    match collection.find_one(filter).await? {
        Some(user) => Ok(user),
        None => Err("No user found with the given id".into()),
    }
}

// =============================================================================================================================

pub async fn create_user(db: &Database, payload: CreateUser) -> Result<User, Box<dyn Error>> {
    payload.validate()?;
    let hashed_password = hash(&payload.password, DEFAULT_COST)?;
    let collection: Collection<User> = db.collection(COLLECTION_NAME);

    let mut user = User {
        id: None,
        username: payload.username,
        email: payload.email,
        password: hashed_password,
        avatar: payload.avatar,
        bio: payload.bio,
        role: payload.role,
        location: payload.location,
    };
    let res = collection.insert_one(&user).await?;
    user.id = res.inserted_id.as_object_id();

    Ok(user)
}

// =============================================================================================================================

pub async fn update_user_by_id(
    db: &Database,
    id: String,
    user: UpdateUser,
) -> Result<User, Box<dyn Error>> {
    let id = ObjectId::from_str(&id)?;
    let collection: Collection<User> = db.collection(COLLECTION_NAME);

    let update_doc = to_document(&user)?;

    match collection
        .find_one_and_update(doc! { "_id": id }, doc! { "$set": update_doc })
        .return_document(ReturnDocument::After)
        .await?
    {
        Some(user) => Ok(user),
        None => Err("Failed to update the current user.".into()),
    }
}

// =============================================================================================================================

pub async fn delete_user_by_id(db: &Database, id: String) -> Result<User, Box<dyn Error>> {
    let id = ObjectId::from_str(&id)?;
    let collection: Collection<User> = db.collection(COLLECTION_NAME);
    match collection.find_one_and_delete(doc! { "_id": id }).await? {
        Some(user) => Ok(user),
        None => Err("No user found with the given id".into()),
    }
}

// =============================================================================================================================
