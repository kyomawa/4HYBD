use crate::models::group_model::{AddGroupMembers, CreateGroup, Group, UpdateGroup};
use bson::oid::ObjectId;
use futures_util::TryStreamExt;
use mongodb::{Collection, Database, bson::doc, options::ReturnDocument};
use std::{error::Error, str::FromStr};
use validator::Validate;

// =============================================================================================================================

const COLLECTION_NAME: &str = "groups";

// =============================================================================================================================

pub async fn get_user_groups(db: &Database, user_id: String) -> Result<Vec<Group>, Box<dyn Error>> {
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "members": user_id
    };

    let cursor = collection.find(filter).await?;
    let groups: Vec<Group> = cursor.try_collect().await?;

    Ok(groups)
}

// =============================================================================================================================

pub async fn get_group_by_id(
    db: &Database,
    group_id: String,
    user_id: String,
) -> Result<Group, Box<dyn Error>> {
    let group_id = ObjectId::from_str(&group_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": group_id,
        "members": user_id
    };

    match collection.find_one(filter).await? {
        Some(group) => Ok(group),
        None => Err("Group not found or user is not a member".into()),
    }
}

// =============================================================================================================================

pub async fn create_group(
    db: &Database,
    payload: CreateGroup,
    creator_id: String,
) -> Result<Group, Box<dyn Error>> {
    payload.validate()?;

    let creator_id = ObjectId::from_str(&creator_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let mut members = vec![creator_id];
    for member_id in payload.members {
        if let Ok(id) = ObjectId::from_str(&member_id) {
            if !members.contains(&id) {
                members.push(id);
            }
        }
    }

    let group = Group {
        id: None,
        name: payload.name,
        creator_id,
        members,
    };

    let result = collection.insert_one(&group).await?;
    let mut created_group = group;
    created_group.id = result.inserted_id.as_object_id();

    Ok(created_group)
}

// =============================================================================================================================

pub async fn update_group(
    db: &Database,
    group_id: String,
    payload: UpdateGroup,
    user_id: String,
) -> Result<Group, Box<dyn Error>> {
    payload.validate()?;

    let group_id = ObjectId::from_str(&group_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": group_id,
        "$or": [
            { "creator_id": user_id },
            { "members": user_id }
        ]
    };

    let update_doc = doc! {
        "$set": {
            "name": payload.name
        }
    };

    match collection
        .find_one_and_update(filter, update_doc)
        .return_document(ReturnDocument::After)
        .await?
    {
        Some(group) => Ok(group),
        None => Err("Group not found or user is not authorized to update".into()),
    }
}

// =============================================================================================================================

pub async fn add_group_members(
    db: &Database,
    group_id: String,
    payload: AddGroupMembers,
    user_id: String,
) -> Result<Group, Box<dyn Error>> {
    let group_id = ObjectId::from_str(&group_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": group_id,
        "creator_id": user_id
    };

    let group = match collection.find_one(filter.clone()).await? {
        Some(group) => group,
        None => return Err("Group not found or user is not the creator".into()),
    };

    let mut new_members = Vec::new();
    for member_id in payload.members {
        if let Ok(id) = ObjectId::from_str(&member_id) {
            if !group.members.contains(&id) {
                new_members.push(id);
            }
        }
    }

    if new_members.is_empty() {
        return Ok(group);
    }

    let update = doc! {
        "$push": {
            "members": {
                "$each": new_members
            }
        }
    };

    match collection
        .find_one_and_update(filter, update)
        .return_document(ReturnDocument::After)
        .await?
    {
        Some(updated_group) => Ok(updated_group),
        None => Err("Failed to update group members".into()),
    }
}

// =============================================================================================================================

pub async fn remove_group_member(
    db: &Database,
    group_id: String,
    member_id: String,
    user_id: String,
) -> Result<Group, Box<dyn Error>> {
    let group_id = ObjectId::from_str(&group_id)?;
    let member_id = ObjectId::from_str(&member_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": group_id,
        "members": member_id
    };

    let group = match collection.find_one(filter.clone()).await? {
        Some(group) => group,
        None => return Err("Group not found or member is not in group".into()),
    };

    let is_creator = group.creator_id == user_id;
    let is_self_remove = member_id == user_id;

    if !is_creator && !is_self_remove {
        return Err("Only the group creator can remove other members".into());
    }

    if group.members.len() <= 1 {
        return Err("Cannot remove the last member from a group".into());
    }

    if group.creator_id == member_id {
        return Err("The creator cannot be removed from the group".into());
    }

    let update = doc! {
        "$pull": {
            "members": member_id
        }
    };

    match collection
        .find_one_and_update(filter, update)
        .return_document(ReturnDocument::After)
        .await?
    {
        Some(updated_group) => Ok(updated_group),
        None => Err("Failed to remove member from group".into()),
    }
}

// =============================================================================================================================

pub async fn delete_group(
    db: &Database,
    group_id: String,
    user_id: String,
) -> Result<Group, Box<dyn Error>> {
    let group_id = ObjectId::from_str(&group_id)?;
    let user_id = ObjectId::from_str(&user_id)?;
    let collection: Collection<Group> = db.collection(COLLECTION_NAME);

    let filter = doc! {
        "_id": group_id,
        "creator_id": user_id
    };

    match collection.find_one_and_delete(filter).await? {
        Some(group) => Ok(group),
        None => Err("Group not found or user is not the creator".into()),
    }
}

// =============================================================================================================================
