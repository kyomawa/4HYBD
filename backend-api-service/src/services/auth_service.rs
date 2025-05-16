use bcrypt::verify;
use mongodb::{Collection, Database, bson::doc};

use std::{error::Error, thread, time::Duration};
use validator::Validate;

use crate::{
    models::{
        auth_model::{AuthLogin, AuthResponse},
        user_model::{CreateUser, User},
    },
    utils::jwt::encode_external_jwt,
};

use super::user_service::create_user;

// =============================================================================================================================

pub async fn register(db: &Database, payload: CreateUser) -> Result<AuthResponse, Box<dyn Error>> {
    let user = create_user(db, payload).await?;
    let user_id = user.id.unwrap().to_hex();

    let token = encode_external_jwt(user_id, user.role)?;

    Ok(AuthResponse { token })
}

// =============================================================================================================================

pub async fn login(db: &Database, payload: AuthLogin) -> Result<AuthResponse, Box<dyn Error>> {
    payload.validate()?;

    let collection: Collection<User> = db.collection("users");
    let filter = doc! {
      "$or": vec![
        doc! {"username": &payload.credential},
        doc! {"email": &payload.credential},
      ]
    };

    let user = match collection.find_one(filter).await {
        Ok(user) => user,
        Err(_) => return Err("No user with this credential exist.".into()),
    }
    .unwrap();

    if let Err(_) | Ok(false) = verify(&payload.password, &user.password) {
        thread::sleep(Duration::from_millis(300));
        return Err("Invalid email or password".into());
    }

    let user_id = user.id.unwrap().to_hex();

    let token = encode_external_jwt(user_id, user.role)?;

    Ok(AuthResponse { token })
}

// =============================================================================================================================
