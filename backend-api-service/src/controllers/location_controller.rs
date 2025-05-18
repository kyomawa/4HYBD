use actix_web::{
    HttpRequest, HttpResponse, Responder, get, post,
    web::{self, Data, Json, Query, ServiceConfig},
};
use mongodb::Database;

use crate::{
    models::location_model::{NearbyUsersQueryParams, UpdateLocationPayload},
    services::location_service,
    utils::{api_response::ApiResponse, jwt::get_authenticated_user},
};

// =============================================================================================================================

pub fn location_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/location")
        .service(update_location)
        .service(find_nearby_users);

    cfg.service(scope);
}

// =============================================================================================================================

#[post("/update")]
async fn update_location(
    db: Data<Database>,
    req: HttpRequest,
    payload: Json<UpdateLocationPayload>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let data = payload.into_inner();

    match location_service::update_user_location(&db, jwt_payload.user_id, data).await {
        Ok(user) => {
            let response = ApiResponse::success("User location updated successfully", user);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to update user location", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/nearby/users")]
async fn find_nearby_users(
    db: Data<Database>,
    req: HttpRequest,
    query: Query<NearbyUsersQueryParams>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let params = query.into_inner();

    match location_service::find_nearby_users(&db, jwt_payload.user_id, params).await {
        Ok(users) => {
            let response = ApiResponse::success("Nearby users found successfully", users);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to find nearby users", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
