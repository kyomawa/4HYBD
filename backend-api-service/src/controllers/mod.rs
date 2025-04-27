use actix_web::{
    HttpResponse, Responder, get,
    web::{self},
};
use user_controller::user_routes;

use crate::utils::api_response::ApiReponse;

pub mod user_controller;

// =============================================================================================================================

pub fn routes(cfg: &mut web::ServiceConfig) {
    let scope = web::scope("/api")
        .service(healthcheck)
        .configure(user_routes);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("/health")]
async fn healthcheck() -> impl Responder {
    HttpResponse::Ok().json(ApiReponse::success("🟢 Backend Service is Alive", ""))
}

// =============================================================================================================================
