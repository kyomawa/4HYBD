use crate::utils::api_response::ApiResponse;
use actix_web::{
    HttpResponse, Responder, get,
    web::{self},
};
use auth_controller::auth_routes;
use friend_controller::friend_routes;
use group_controller::group_routes;
use location_controller::location_routes;
use message_controller::message_routes;
use story_controller::story_routes;
use user_controller::user_routes;

pub mod auth_controller;
pub mod friend_controller;
pub mod group_controller;
pub mod location_controller;
pub mod message_controller;
pub mod story_controller;
pub mod user_controller;

// =============================================================================================================================

pub fn routes(cfg: &mut web::ServiceConfig) {
    let scope = web::scope("/api")
        .service(healthcheck)
        .configure(auth_routes)
        .configure(user_routes)
        .configure(friend_routes)
        .configure(group_routes)
        .configure(message_routes)
        .configure(story_routes)
        .configure(location_routes);

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
