use actix_web::{
    HttpRequest, HttpResponse, Responder, delete, get, post, put,
    web::{self, Data, Json, Path},
};
use mongodb::Database;

use crate::{
    models::user_model::{CreateUser, UpdateUser, UserRole},
    services::user_service,
    utils::{
        api_response::ApiResponse,
        jwt::{get_authenticated_user, user_has_any_of_these_roles},
    },
};

// =============================================================================================================================

pub fn user_routes(cfg: &mut web::ServiceConfig) {
    let scope = web::scope("/users")
        .service(get_users)
        .service(get_me)
        .service(get_user_by_id)
        .service(create_user)
        .service(update_me)
        .service(update_user_by_id)
        .service(delete_me)
        .service(delete_user_by_id);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("")]
async fn get_users(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let required_roles = &[UserRole::Admin];
    match user_has_any_of_these_roles(&req, required_roles) {
        Ok(claims) => claims,
        Err(err_res) => return err_res,
    };

    match user_service::get_users(&db).await {
        Ok(users) => {
            let response = ApiResponse::success("Users have been successfully recovered", users);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response =
                ApiResponse::error("An error occured while retrieving users.", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/me")]
async fn get_me(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };
    let id = jwt_payload.user_id;

    match user_service::get_user_by_id(&db, id).await {
        Ok(user) => {
            let response = ApiResponse::success("User successfully retrieved", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve the user", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/{id}")]
async fn get_user_by_id(db: Data<Database>, req: HttpRequest, id: Path<String>) -> impl Responder {
    match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };
    let id = id.into_inner();

    match user_service::get_user_by_id(&db, id).await {
        Ok(user) => {
            let response = ApiResponse::success("User successfully retrieved", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve the user", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("")]
async fn create_user(
    db: Data<Database>,
    payload: Json<CreateUser>,
    req: HttpRequest,
) -> impl Responder {
    let data = payload.into_inner();
    let required_roles = &[UserRole::Admin];
    match user_has_any_of_these_roles(&req, required_roles) {
        Ok(claims) => claims,
        Err(err_res) => return err_res,
    };

    match user_service::create_user(&db, data).await {
        Ok(user) => {
            let response = ApiResponse::success("User created successfully", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to create user", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[put("/me")]
async fn update_me(
    db: Data<Database>,
    payload: Json<UpdateUser>,
    req: HttpRequest,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let id = jwt_payload.user_id;
    let data = payload.into_inner();

    match user_service::update_user_by_id(&db, id, data).await {
        Ok(user) => {
            let response = ApiResponse::success("User successfully updated.", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("An error occurred.", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[put("/{id}")]
async fn update_user_by_id(
    db: Data<Database>,
    id: Path<String>,
    payload: Json<UpdateUser>,
    req: HttpRequest,
) -> impl Responder {
    let required_roles = &[UserRole::Admin];
    match user_has_any_of_these_roles(&req, required_roles) {
        Ok(claims) => claims,
        Err(err_res) => return err_res,
    };

    let id = id.into_inner();
    let data = payload.into_inner();

    match user_service::update_user_by_id(&db, id, data).await {
        Ok(user) => {
            let response = ApiResponse::success("User successfully updated.", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("An error occurred.", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[delete("/me")]
async fn delete_me(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(e) => return e,
    };

    match user_service::delete_user_by_id(&db, jwt_payload.user_id).await {
        Ok(user) => {
            let res = ApiResponse::success("User successfully deleted", user);
            HttpResponse::Ok().json(res)
        }
        Err(e) => {
            let res = ApiResponse::error("An error occured: ", e.to_string());
            HttpResponse::InternalServerError().json(res)
        }
    }
}

// =============================================================================================================================

#[delete("/{id}")]
async fn delete_user_by_id(
    db: Data<Database>,
    id: Path<String>,
    req: HttpRequest,
) -> impl Responder {
    let required_roles = &[UserRole::Admin];
    match user_has_any_of_these_roles(&req, required_roles) {
        Ok(claims) => claims,
        Err(err_res) => return err_res,
    };

    let id = id.into_inner();

    match user_service::delete_user_by_id(&db, id).await {
        Ok(user) => {
            let response = ApiResponse::success("User was successfully deleted.", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("An error occurred", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
