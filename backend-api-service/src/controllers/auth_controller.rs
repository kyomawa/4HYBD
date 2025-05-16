use actix_web::{
    HttpResponse, Responder, post,
    web::{self, Data, Json, ServiceConfig},
};
use mongodb::Database;

use crate::{
    models::{auth_model::AuthLogin, user_model::CreateUser},
    services::auth_service,
    utils::api_response::ApiResponse,
};

// =============================================================================================================================

pub fn auth_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/auth");

    cfg.service(scope);
}

// =============================================================================================================================

#[post("/register")]
async fn register(db: Data<Database>, data: Json<CreateUser>) -> impl Responder {
    let data: CreateUser = data.into_inner();

    match auth_service::register(&db, data).await {
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

#[post("/login")]
async fn login(db: Data<Database>, data: Json<AuthLogin>) -> impl Responder {
    let data = data.into_inner();

    match auth_service::login(&db, data).await {
        Ok(user) => {
            let response = ApiResponse::success("User connected successfully", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to create user", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
