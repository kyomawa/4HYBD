use crate::{
    models::auth_model::{AuthLogin, AuthRegister},
    services::auth_service,
    utils::{api_response::ApiResponse, jwt::get_authenticated_user},
};
use actix_web::{
    HttpRequest, HttpResponse, Responder, get, post,
    web::{self, Data, Json, ServiceConfig},
};
use mongodb::Database;

// =============================================================================================================================

pub fn auth_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/auth")
        .service(get_me)
        .service(register)
        .service(login);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("/me")]
async fn get_me(req: HttpRequest) -> impl Responder {
    match get_authenticated_user(&req) {
        Ok(payload) => {
            let res = ApiResponse::success("User data in the jwt successfully retrieved", payload);
            HttpResponse::Ok().json(res)
        }
        Err(e) => e,
    }
}

// =============================================================================================================================

#[post("/register")]
async fn register(db: Data<Database>, data: Json<AuthRegister>) -> impl Responder {
    let data = data.into_inner();

    match auth_service::register(&db, data).await {
        Ok(user) => {
            let res = ApiResponse::success("User created successfully", user);
            HttpResponse::Ok().json(res)
        }
        Err(e) => {
            let res = ApiResponse::error("Failed to create user", e.to_string());
            HttpResponse::InternalServerError().json(res)
        }
    }
}

// =============================================================================================================================

#[post("/login")]
async fn login(db: Data<Database>, data: Json<AuthLogin>) -> impl Responder {
    let data = data.into_inner();

    match auth_service::login(&db, data).await {
        Ok(user) => {
            let res = ApiResponse::success("User connected successfully", user);
            HttpResponse::Ok().json(res)
        }
        Err(e) => {
            let res = ApiResponse::error("Failed to login the user", e.to_string());
            HttpResponse::InternalServerError().json(res)
        }
    }
}

// =============================================================================================================================
