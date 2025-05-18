use actix_web::{
    HttpRequest, HttpResponse, Responder, delete, get, patch, post,
    web::{self, Data, Json, Path, ServiceConfig},
};
use mongodb::Database;

use crate::{
    models::friend_model::FindFriend,
    services::friend_service,
    utils::{api_response::ApiResponse, jwt::get_authenticated_user},
};

// =============================================================================================================================

pub fn friend_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/friends")
        .service(get_friends)
        .service(get_friend_requests)
        .service(find_friend)
        .service(send_friend_request)
        .service(accept_friend_request)
        .service(delete_friend);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("")]
async fn get_friends(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    match friend_service::get_friends(&db, jwt_payload.user_id).await {
        Ok(friends) => {
            let response = ApiResponse::success("Friends retrieved successfully", friends);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve friends", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/requests")]
async fn get_friend_requests(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    match friend_service::get_friend_requests(&db, jwt_payload.user_id).await {
        Ok(requests) => {
            let response = ApiResponse::success("Friend requests retrieved successfully", requests);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve friend requests", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("/find")]
async fn find_friend(
    db: Data<Database>,
    req: HttpRequest,
    data: Json<FindFriend>,
) -> impl Responder {
    match get_authenticated_user(&req) {
        Ok(_) => {}
        Err(err_res) => return err_res,
    };

    let data = data.into_inner();

    if let Some(email) = data.email {
        match friend_service::find_user_by_email(&db, email).await {
            Ok(user) => {
                let response = ApiResponse::success("User found successfully", user);
                HttpResponse::Ok().json(response)
            }
            Err(e) => {
                let response = ApiResponse::error("Failed to find user", e.to_string());
                HttpResponse::NotFound().json(response)
            }
        }
    } else if let Some(user_id) = data.user_id {
        match friend_service::find_user_by_id(&db, user_id).await {
            Ok(user) => {
                let response = ApiResponse::success("User found successfully", user);
                HttpResponse::Ok().json(response)
            }
            Err(e) => {
                let response = ApiResponse::error("Failed to find user", e.to_string());
                HttpResponse::NotFound().json(response)
            }
        }
    } else {
        let response = ApiResponse::error(
            "Invalid request",
            "Either email or user_id must be provided",
        );
        HttpResponse::BadRequest().json(response)
    }
}

// =============================================================================================================================

#[post("/request/{user_id}")]
async fn send_friend_request(
    db: Data<Database>,
    req: HttpRequest,
    user_id: Path<String>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let friend_id = user_id.into_inner();

    match friend_service::send_friend_request(&db, jwt_payload.user_id, friend_id).await {
        Ok(request) => {
            let response = ApiResponse::success("Friend request sent successfully", request);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to send friend request", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[patch("/accept/{request_id}")]
async fn accept_friend_request(
    db: Data<Database>,
    req: HttpRequest,
    request_id: Path<String>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let request_id = request_id.into_inner();

    match friend_service::accept_friend_request(&db, request_id, jwt_payload.user_id).await {
        Ok(friend) => {
            let response = ApiResponse::success("Friend request accepted successfully", friend);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to accept friend request", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[delete("/{user_id}")]
async fn delete_friend(
    db: Data<Database>,
    req: HttpRequest,
    user_id: Path<String>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let friend_id = user_id.into_inner();

    match friend_service::delete_friend(&db, jwt_payload.user_id, friend_id).await {
        Ok(_) => {
            let response = ApiResponse::success("Friend removed successfully", ());
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to remove friend", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
