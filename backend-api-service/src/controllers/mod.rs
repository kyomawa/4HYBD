use crate::utils::api_response::ApiResponse;
use actix_web::{
    HttpResponse, Responder, get,
    web::{self},
};
use auth_controller::auth_routes;
use user_controller::user_routes;

pub mod auth_controller;
pub mod user_controller;

// =============================================================================================================================

pub fn routes(cfg: &mut web::ServiceConfig) {
    let scope = web::scope("/api")
        .service(healthcheck)
        .configure(auth_routes)
        .configure(user_routes);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("/health")]
async fn healthcheck() -> impl Responder {
    HttpResponse::Ok().json(ApiResponse::success(
        "🟢 Backend Service is Alive",
        Some(()),
    ))
}

// =============================================================================================================================
