use reqwest::{Client, StatusCode};
use serde::Serialize;
use std::{env, error::Error};
use uuid::Uuid;

// =============================================================================================================================

const MINIO_API_URL: &str = "MINIO_SERVER_URL";
const MINIO_ACCESS_KEY: &str = "MINIO_ROOT_USER";
const MINIO_SECRET_KEY: &str = "MINIO_ROOT_PASSWORD";
const BUCKET_NAME: &str = "snapshoot-media";

// =============================================================================================================================

#[derive(Serialize)]
struct PresignedUrlRequest {
    bucket: String,
    object: String,
    expires: i64,
}

// =============================================================================================================================

pub async fn upload_file(file_data: &[u8], file_type: &str) -> Result<String, Box<dyn Error>> {
    let minio_url = env::var(MINIO_API_URL).expect("MINIO_SERVER_URL not set");
    let access_key = env::var(MINIO_ACCESS_KEY).expect("MINIO_ROOT_USER not set");
    let secret_key = env::var(MINIO_SECRET_KEY).expect("MINIO_ROOT_PASSWORD not set");

    let file_name = format!("{}.{}", Uuid::new_v4(), file_extension_from_type(file_type));
    let upload_url = format!("{}/{}/{}", minio_url, BUCKET_NAME, file_name);

    let client = Client::new();
    let response = client
        .put(&upload_url)
        .header(
            "Authorization",
            format!("AWS4-HMAC-SHA256 Credential={}", access_key),
        )
        .header("x-amz-secret-key", &secret_key)
        .header("Content-Type", file_type)
        .body(file_data.to_vec())
        .send()
        .await?;

    if response.status() != StatusCode::OK && response.status() != StatusCode::CREATED {
        return Err(format!("Failed to upload file: {}", response.status()).into());
    }

    Ok(upload_url)
}

// =============================================================================================================================

pub async fn delete_file(file_url: &str) -> Result<(), Box<dyn Error>> {
    let minio_url = env::var(MINIO_API_URL).expect("MINIO_SERVER_URL not set");
    let access_key = env::var(MINIO_ACCESS_KEY).expect("MINIO_ROOT_USER not set");
    let secret_key = env::var(MINIO_SECRET_KEY).expect("MINIO_ROOT_PASSWORD not set");

    if !file_url.starts_with(&minio_url) {
        return Err("Invalid file URL".into());
    }

    let file_path = file_url
        .strip_prefix(&format!("{}/", minio_url))
        .unwrap_or("");

    let client = Client::new();
    let response = client
        .delete(file_url)
        .header(
            "Authorization",
            format!("AWS4-HMAC-SHA256 Credential={}", access_key),
        )
        .header("x-amz-secret-key", &secret_key)
        .send()
        .await?;

    if response.status() != StatusCode::OK && response.status() != StatusCode::NO_CONTENT {
        return Err(format!("Failed to delete file {}: {}", file_path, response.status()).into());
    }

    Ok(())
}

// =============================================================================================================================

pub async fn get_presigned_url(
    file_name: &str,
    expires_in_seconds: i64,
) -> Result<String, Box<dyn Error>> {
    let minio_url = env::var(MINIO_API_URL).expect("MINIO_SERVER_URL not set");
    let access_key = env::var(MINIO_ACCESS_KEY).expect("MINIO_ROOT_USER not set");
    let secret_key = env::var(MINIO_SECRET_KEY).expect("MINIO_ROOT_PASSWORD not set");

    let api_url = format!("{}/minio/presigned-url", minio_url);

    let request = PresignedUrlRequest {
        bucket: BUCKET_NAME.to_string(),
        object: file_name.to_string(),
        expires: expires_in_seconds,
    };

    let client = Client::new();
    let response = client
        .post(&api_url)
        .header(
            "Authorization",
            format!("AWS4-HMAC-SHA256 Credential={}", access_key),
        )
        .header("x-amz-secret-key", &secret_key)
        .json(&request)
        .send()
        .await?;

    if response.status() != StatusCode::OK {
        return Err(format!("Failed to get presigned URL: {}", response.status()).into());
    }

    let url: String = response.json().await?;
    Ok(url)
}

// =============================================================================================================================

fn file_extension_from_type(content_type: &str) -> &str {
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
