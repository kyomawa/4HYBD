use actix_web::{
    HttpRequest, HttpResponse, Responder, delete, get,
    http::header::ContentType,
    post,
    web::{self, Bytes, Data, Json, Path, Query, ServiceConfig},
};
use mongodb::Database;

use crate::{
    models::{
        message_model::{Media, MediaType},
        story_model::{CreateStory, Location, NearbyQueryParams},
    },
    services::{file_service, story_service},
    utils::{api_response::ApiResponse, jwt::get_authenticated_user},
};

// =============================================================================================================================

pub fn story_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/stories")
        .service(get_stories)
        .service(get_nearby_stories)
        .service(create_story)
        .service(create_story_with_media)
        .service(get_story_by_id)
        .service(delete_story);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("")]
async fn get_stories(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    match story_service::get_friend_stories(&db, jwt_payload.user_id).await {
        Ok(stories) => {
            let response = ApiResponse::success("Stories retrieved successfully", stories);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve stories", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/nearby")]
async fn get_nearby_stories(
    db: Data<Database>,
    req: HttpRequest,
    query: Query<NearbyQueryParams>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let params = query.into_inner();

    match story_service::get_nearby_stories(&db, jwt_payload.user_id, params).await {
        Ok(stories) => {
            let response = ApiResponse::success("Nearby stories retrieved successfully", stories);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve nearby stories", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("")]
async fn create_story(
    db: Data<Database>,
    req: HttpRequest,
    payload: Json<CreateStory>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let data = payload.into_inner();

    match story_service::create_story(&db, jwt_payload.user_id, data).await {
        Ok(story) => {
            let response = ApiResponse::success("Story created successfully", story);
            HttpResponse::Created().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to create story", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("/media")]
async fn create_story_with_media(
    db: Data<Database>,
    req: HttpRequest,
    content_type: web::Header<ContentType>,
    body: Bytes,
    location: Query<Location>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let content_type_str = content_type.to_string();

    // Validate file type
    if !content_type_str.starts_with("image/") && !content_type_str.starts_with("video/") {
        let response = ApiResponse::error(
            "Invalid content type",
            "Only image and video files are allowed",
        );
        return HttpResponse::BadRequest().json(response);
    }

    // Validate file size
    if let Err(e) = file_service::validate_file_size(&content_type_str, body.len()) {
        let response = ApiResponse::error("File size validation failed", e);
        return HttpResponse::BadRequest().json(response);
    }

    // Upload file to MinIO
    match file_service::upload_file(&body, &content_type_str).await {
        Ok(url) => {
            let media_type = if content_type_str.starts_with("image/") {
                MediaType::Image
            } else {
                MediaType::Video
            };

            let duration = if content_type_str.starts_with("video/") {
                Some(10.0) // Default to 10 seconds max
            } else {
                None
            };

            let media = Media {
                media_type,
                url,
                duration,
            };

            let story = CreateStory {
                media,
                location: location.into_inner(),
            };

            match story_service::create_story(&db, jwt_payload.user_id, story).await {
                Ok(story) => {
                    let response =
                        ApiResponse::success("Story with media created successfully", story);
                    HttpResponse::Created().json(response)
                }
                Err(e) => {
                    let response =
                        ApiResponse::error("Failed to create story with media", e.to_string());
                    HttpResponse::InternalServerError().json(response)
                }
            }
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to upload media", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/{story_id}")]
async fn get_story_by_id(
    db: Data<Database>,
    req: HttpRequest,
    story_id: Path<String>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let story_id = story_id.into_inner();

    match story_service::get_story_by_id(&db, story_id, jwt_payload.user_id).await {
        Ok(story) => {
            let response = ApiResponse::success("Story retrieved successfully", story);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve story", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[delete("/{story_id}")]
async fn delete_story(
    db: Data<Database>,
    req: HttpRequest,
    story_id: Path<String>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let story_id = story_id.into_inner();

    match story_service::delete_story(&db, story_id, jwt_payload.user_id).await {
        Ok(_) => {
            let response = ApiResponse::success("Story deleted successfully", ());
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to delete story", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
