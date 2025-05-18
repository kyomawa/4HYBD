use once_cell::sync::Lazy;
use reqwest::{Client, StatusCode};
use std::{env, error::Error};
use uuid::Uuid;

// =============================================================================================================================

static MINIO_URL: Lazy<String> =
    Lazy::new(|| env::var("MINIO_SERVER_URL").expect("MINIO_SERVER_URL not set"));
static MINIO_ACCESS_KEY: Lazy<String> =
    Lazy::new(|| env::var("MINIO_ROOT_USER").expect("MINIO_ROOT_USER not set"));
static MINIO_SECRET_KEY: Lazy<String> =
    Lazy::new(|| env::var("MINIO_ROOT_PASSWORD").expect("MINIO_ROOT_PASSWORD not set"));
const BUCKET_NAME: &str = "snapshoot-media";

// =============================================================================================================================

pub async fn upload_file(file_data: &[u8], content_type: &str) -> Result<String, Box<dyn Error>> {
    let file_name = format!(
        "{}.{}",
        Uuid::new_v4(),
        file_extension_from_type(content_type)
    );
    let url = format!("{}/{}/{}", *MINIO_URL, BUCKET_NAME, file_name);

    let client = Client::new();
    let response = client
        .put(&url)
        .header("Content-Type", content_type)
        .body(file_data.to_vec())
        .basic_auth(&*MINIO_ACCESS_KEY, Some(&*MINIO_SECRET_KEY))
        .send()
        .await?;

    if response.status() != StatusCode::OK
        && response.status() != StatusCode::CREATED
        && response.status() != StatusCode::NO_CONTENT
    {
        return Err(format!(
            "Failed to upload file: {} - {}",
            response.status(),
            response.text().await?
        )
        .into());
    }

    Ok(url)
}

// =============================================================================================================================

pub async fn delete_file(file_url: &str) -> Result<(), Box<dyn Error>> {
    if !file_url.starts_with(&*MINIO_URL) {
        return Err("Invalid file URL".into());
    }

    let client = Client::new();
    let response = client
        .delete(file_url)
        .basic_auth(&*MINIO_ACCESS_KEY, Some(&*MINIO_SECRET_KEY))
        .send()
        .await?;

    if response.status() != StatusCode::OK && response.status() != StatusCode::NO_CONTENT {
        return Err(format!(
            "Failed to delete file: {} - {}",
            response.status(),
            response.text().await?
        )
        .into());
    }

    Ok(())
}

// =============================================================================================================================

pub fn file_extension_from_type(content_type: &str) -> &str {
    match content_type {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "video/mp4" => "mp4",
        "video/webm" => "webm",
        "video/ogg" => "ogv",
        _ => "bin",
    }
}

// =============================================================================================================================

pub fn validate_file_size(content_type: &str, size: usize) -> Result<(), String> {
    if content_type.starts_with("video/") && size > 10 * 1024 * 1024 {
        return Err("Videos must be under 10MB (approximately 10 seconds)".to_string());
    }

    if content_type.starts_with("image/") && size > 5 * 1024 * 1024 {
        return Err("Images must be under 5MB".to_string());
    }

    Ok(())
}

// ==============================================================================================================================
