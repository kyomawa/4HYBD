use crate::{
    models::{
        auth_model::{AuthLogin, AuthRegister, AuthResponse},
        user_model::{User, UserRole},
    },
    utils::jwt::encode_external_jwt,
};
use bcrypt::{DEFAULT_COST, hash, verify};
use mongodb::{Collection, Database, bson::doc};
use std::{error::Error, thread, time::Duration};
use validator::Validate;

// =============================================================================================================================

pub async fn register(
    db: &Database,
    payload: AuthRegister,
) -> Result<AuthResponse, Box<dyn Error>> {
    let user = create_basic_user(db, payload).await?;
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

    let user_result = collection.find_one(filter).await;

    let user = match user_result {
        Ok(Some(user)) => user,
        Ok(None) => {
            thread::sleep(Duration::from_millis(300));
            return Err("Invalid credential or password".into());
        }
        Err(_) => return Err("Database error occurred".into()),
    };

    if let Err(_) | Ok(false) = verify(&payload.password, &user.password) {
        thread::sleep(Duration::from_millis(300));
        return Err("Invalid email or password".into());
    }

    let user_id = user.id.unwrap().to_hex();
    let token = encode_external_jwt(user_id, user.role)?;

    Ok(AuthResponse { 
        token,
        user: user.clone(),
    })
}

// =============================================================================================================================

async fn create_basic_user(db: &Database, payload: AuthRegister) -> Result<User, Box<dyn Error>> {
    payload.validate()?;

    let hashed_password = hash(&payload.password, DEFAULT_COST)?;
    let mut user = User {
        id: None,
        username: payload.username,
        email: payload.email,
        password: hashed_password,
        avatar: payload.avatar,
        bio: payload.bio,
        role: UserRole::User,
        location: payload.location,
    };

    let collection: Collection<User> = db.collection("users");
    let res = collection.insert_one(&user).await?;
    user.id = res.inserted_id.as_object_id();

    Ok(user)
}

// =============================================================================================================================
