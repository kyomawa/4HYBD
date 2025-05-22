use actix_web::{
    HttpRequest, HttpResponse, Responder, delete, get,
    http::header::ContentType,
    post,
    web::{self, Bytes, Data, Json, Path, Query, ServiceConfig},
};
use mongodb::Database;
use serde::Deserialize;

use crate::{
    models::message_model::{CreateMessage, Media, MediaType, MessageQueryParams},
    services::{file_service, message_service},
    utils::{api_response::ApiResponse, jwt::get_authenticated_user},
};

// =============================================================================================================================

pub fn message_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/messages")
        .service(get_direct_messages)
        .service(send_direct_message)
        .service(send_direct_message_with_media)
        .service(get_group_messages)
        .service(send_group_message)
        .service(send_group_message_with_media)
        .service(delete_message);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("/{recipient_id}")]
async fn get_direct_messages(
    db: Data<Database>,
    req: HttpRequest,
    recipient_id: Path<String>,
    query: Query<MessageQueryParams>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let recipient_id = recipient_id.into_inner();
    let params = query.into_inner();

    match message_service::get_direct_messages(&db, jwt_payload.user_id, recipient_id, params).await
    {
        Ok(messages) => {
            let response = ApiResponse::success("Messages retrieved successfully", messages);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve messages", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("/{recipient_id}")]
async fn send_direct_message(
    db: Data<Database>,
    req: HttpRequest,
    recipient_id: Path<String>,
    payload: Json<CreateMessage>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let recipient_id = recipient_id.into_inner();
    let data = payload.into_inner();

    match message_service::send_direct_message(&db, jwt_payload.user_id, recipient_id, data).await {
        Ok(message) => {
            let response = ApiResponse::success("Message sent successfully", message);
            HttpResponse::Created().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to send message", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[derive(Deserialize)]
pub struct MediaQueryParams {
    pub text_content: Option<String>,
}

#[post("/{recipient_id}/media")]
async fn send_direct_message_with_media(
    db: Data<Database>,
    req: HttpRequest,
    recipient_id: Path<String>,
    content_type: web::Header<ContentType>,
    body: Bytes,
    query: Query<MediaQueryParams>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let recipient_id = recipient_id.into_inner();
    let content_type_str = content_type.to_string();
    let query_params = query.into_inner();

    // Validate file type
    if let Err(e) = file_service::validate_content_type(&content_type_str) {
        println!("❌ Invalid content type: {}", e);
        let response = ApiResponse::error("Invalid content type", e);
        return HttpResponse::BadRequest().json(response);
    }

    // Validate file size
    if let Err(e) = file_service::validate_file_size(&content_type_str, body.len()) {
        println!("❌ File size validation failed: {}", e);
        let response = ApiResponse::error("File size validation failed", e);
        return HttpResponse::BadRequest().json(response);
    }

    // Upload file to MinIO
    match file_service::upload_file(&body, &content_type_str).await {
        Ok(url) => {
            // Create message with media
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
                url: url.clone(),
                duration,
            };

            let message = CreateMessage {
                content: query_params.text_content.unwrap_or_else(|| "".to_string()),
                media: Some(media),
            };

            match message_service::send_direct_message(
                &db,
                jwt_payload.user_id,
                recipient_id,
                message,
            )
            .await
            {
                Ok(message) => {
                    let response =
                        ApiResponse::success("Message with media sent successfully", message);
                    HttpResponse::Created().json(response)
                }
                Err(e) => {
                    let response =
                        ApiResponse::error("Failed to send message with media", e.to_string());
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

#[get("/groups/{group_id}")]
async fn get_group_messages(
    db: Data<Database>,
    req: HttpRequest,
    group_id: Path<String>,
    query: Query<MessageQueryParams>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();
    let params = query.into_inner();

    match message_service::get_group_messages(&db, jwt_payload.user_id, group_id, params).await {
        Ok(messages) => {
            let response = ApiResponse::success("Group messages retrieved successfully", messages);
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve group messages", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("/groups/{group_id}")]
async fn send_group_message(
    db: Data<Database>,
    req: HttpRequest,
    group_id: Path<String>,
    payload: Json<CreateMessage>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();
    let data = payload.into_inner();

    match message_service::send_group_message(&db, jwt_payload.user_id, group_id, data).await {
        Ok(message) => {
            let response = ApiResponse::success("Group message sent successfully", message);
            HttpResponse::Created().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to send group message", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("/groups/{group_id}/media")]
async fn send_group_message_with_media(
    db: Data<Database>,
    req: HttpRequest,
    group_id: Path<String>,
    content_type: web::Header<ContentType>,
    body: Bytes,
    query: Query<MediaQueryParams>, // ✅ Utilisez le même type que pour les messages directs
) -> impl Responder {
    println!("🚀 Starting group media upload process...");

    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();
    let content_type_str = content_type.to_string();
    let query_params = query.into_inner(); // ✅ Utilisez la même structure

    println!("👤 User ID: {}", jwt_payload.user_id);
    println!("👥 Group ID: {}", group_id);
    println!("📋 Content Type: {}", content_type_str);
    println!("📏 Body size: {} bytes", body.len());
    println!("💬 Text content: {:?}", query_params.text_content);

    // ✅ Utilisez la nouvelle validation
    if let Err(e) = file_service::validate_content_type(&content_type_str) {
        println!("❌ Invalid content type: {}", e);
        let response = ApiResponse::error("Invalid content type", e);
        return HttpResponse::BadRequest().json(response);
    }

    // Validate file size
    if let Err(e) = file_service::validate_file_size(&content_type_str, body.len()) {
        println!("❌ File size validation failed: {}", e);
        let response = ApiResponse::error("File size validation failed", e);
        return HttpResponse::BadRequest().json(response);
    }

    println!("✅ Validations passed, starting file upload...");

    // Upload file to MinIO
    match file_service::upload_file(&body, &content_type_str).await {
        Ok(url) => {
            println!("✅ File uploaded successfully to: {}", url);

            // Create message with media
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
                url: url.clone(),
                duration,
            };

            let message = CreateMessage {
                content: query_params.text_content.unwrap_or_else(|| "".to_string()), // ✅ Même logique
                media: Some(media),
            };

            println!("💾 Saving group message to database...");

            match message_service::send_group_message(&db, jwt_payload.user_id, group_id, message)
                .await
            {
                Ok(message) => {
                    println!("✅ Group message saved successfully!");
                    let response =
                        ApiResponse::success("Group message with media sent successfully", message);
                    HttpResponse::Created().json(response)
                }
                Err(e) => {
                    println!("❌ Failed to save group message: {}", e);
                    let response = ApiResponse::error(
                        "Failed to send group message with media",
                        e.to_string(),
                    );
                    HttpResponse::InternalServerError().json(response)
                }
            }
        }
        Err(e) => {
            println!("❌ File upload failed: {}", e);
            let response = ApiResponse::error("Failed to upload media", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[delete("/{message_id}")]
async fn delete_message(
    db: Data<Database>,
    req: HttpRequest,
    message_id: Path<String>,
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let message_id = message_id.into_inner();

    match message_service::delete_message(&db, message_id, jwt_payload.user_id).await {
        Ok(_) => {
            let response = ApiResponse::success("Message deleted successfully", ());
            HttpResponse::Ok().json(response)
        }
        Err(e) => {
            let response = ApiResponse::error("Failed to delete message", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
