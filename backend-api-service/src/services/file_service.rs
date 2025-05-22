use aws_config::{BehaviorVersion, Region};
use aws_sdk_s3::config::{Credentials, SharedCredentialsProvider};
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::{Client, Config};
use std::{env, error::Error};
use uuid::Uuid;

// =============================================================================================================================

const BUCKET_NAME: &str = "snapshoot-media";

// =============================================================================================================================

// Configuration du client S3/MinIO
async fn get_s3_client() -> Result<Client, Box<dyn Error>> {
    let endpoint_url =
        env::var("MINIO_SERVER_URL").unwrap_or_else(|_| "http://minio:9000".to_string());
    let access_key = env::var("MINIO_ROOT_USER").unwrap_or_else(|_| "minioadmin".to_string());
    let secret_key = env::var("MINIO_ROOT_PASSWORD").unwrap_or_else(|_| "minioadmin".to_string());

    println!(
        "🔧 MinIO S3 Config - URL: {}, User: {}",
        endpoint_url, access_key
    );

    // Configuration des credentials
    let credentials = Credentials::new(access_key, secret_key, None, None, "minio-rust-client");

    let credentials_provider = SharedCredentialsProvider::new(credentials);

    // Configuration du client S3
    let config = Config::builder()
        .endpoint_url(&endpoint_url)
        .credentials_provider(credentials_provider)
        .region(Region::new("us-east-1")) // MinIO accepte n'importe quelle région
        .force_path_style(true) // Nécessaire pour MinIO
        .behavior_version(BehaviorVersion::latest())
        .build();

    Ok(Client::from_conf(config))
}

// =============================================================================================================================

pub async fn upload_file(file_data: &[u8], content_type: &str) -> Result<String, Box<dyn Error>> {
    let file_name = format!(
        "{}.{}",
        Uuid::new_v4(),
        file_extension_from_type(content_type)
    );

    println!("🔄 Attempting to upload file: {}", file_name);
    println!("📁 File size: {} bytes", file_data.len());
    println!("📋 Content type: {}", content_type);

    let client = get_s3_client().await?;

    // Convertir les données en ByteStream
    let body = ByteStream::from(file_data.to_vec());

    // Upload du fichier
    let put_object_result = client
        .put_object()
        .bucket(BUCKET_NAME)
        .key(&file_name)
        .body(body)
        .content_type(content_type)
        .send()
        .await;

    match put_object_result {
        Ok(_) => {
            let endpoint_url =
                env::var("MINIO_SERVER_URL").unwrap_or_else(|_| "http://minio:9000".to_string());
            let file_url = format!("{}/{}/{}", endpoint_url, BUCKET_NAME, file_name);

            println!("✅ File uploaded successfully to: {}", file_url);
            Ok(file_url)
        }
        Err(e) => {
            println!("❌ Upload failed: {:?}", e);
            Err(format!("Failed to upload file: {:?}", e).into())
        }
    }
}

// =============================================================================================================================

pub async fn delete_file(file_url: &str) -> Result<(), Box<dyn Error>> {
    println!("🗑️ Attempting to delete file: {}", file_url);

    // Extraire le nom du fichier de l'URL
    let file_name = file_url.split('/').last().ok_or("Invalid file URL")?;

    let client = get_s3_client().await?;

    // Suppression du fichier
    let delete_result = client
        .delete_object()
        .bucket(BUCKET_NAME)
        .key(file_name)
        .send()
        .await;

    match delete_result {
        Ok(_) => {
            println!("✅ File deleted successfully: {}", file_name);
            Ok(())
        }
        Err(e) => {
            println!("❌ Delete failed: {:?}", e);
            Err(format!("Failed to delete file: {:?}", e).into())
        }
    }
}

// =============================================================================================================================

pub async fn create_bucket_if_not_exists() -> Result<(), Box<dyn Error>> {
    println!("🪣 Checking if bucket '{}' exists...", BUCKET_NAME);

    let client = get_s3_client().await?;

    // Vérifier si le bucket existe
    let head_bucket_result = client.head_bucket().bucket(BUCKET_NAME).send().await;

    match head_bucket_result {
        Ok(_) => {
            println!("✅ Bucket '{}' already exists", BUCKET_NAME);
            Ok(())
        }
        Err(_) => {
            println!("🔨 Creating bucket '{}'...", BUCKET_NAME);

            let create_result = client.create_bucket().bucket(BUCKET_NAME).send().await;

            match create_result {
                Ok(_) => {
                    println!("✅ Bucket '{}' created successfully", BUCKET_NAME);
                    Ok(())
                }
                Err(e) => {
                    println!("❌ Failed to create bucket: {:?}", e);
                    Err(format!("Failed to create bucket: {:?}", e).into())
                }
            }
        }
    }
}

// =============================================================================================================================

pub fn file_extension_from_type(content_type: &str) -> &str {
    match content_type {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "video/mp4" => "mp4",
        "video/webm" => "webm",
        "video/ogg" => "ogv",
        "video/avi" => "avi",
        "video/mov" => "mov",
        _ => "bin",
    }
}

// =============================================================================================================================

pub fn validate_file_size(content_type: &str, size: usize) -> Result<(), String> {
    const MAX_VIDEO_SIZE: usize = 10 * 1024 * 1024; // 10MB
    const MAX_IMAGE_SIZE: usize = 5 * 1024 * 1024; // 5MB

    if content_type.starts_with("video/") && size > MAX_VIDEO_SIZE {
        return Err("Videos must be under 10MB (approximately 10 seconds)".to_string());
    }

    if content_type.starts_with("image/") && size > MAX_IMAGE_SIZE {
        return Err("Images must be under 5MB".to_string());
    }

    Ok(())
}

// =============================================================================================================================

pub fn validate_content_type(content_type: &str) -> Result<(), String> {
    const ALLOWED_IMAGE_TYPES: &[&str] = &["image/jpeg", "image/png", "image/gif", "image/webp"];

    const ALLOWED_VIDEO_TYPES: &[&str] = &[
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/avi",
        "video/mov",
    ];

    if ALLOWED_IMAGE_TYPES.contains(&content_type) || ALLOWED_VIDEO_TYPES.contains(&content_type) {
        Ok(())
    } else {
        Err(format!("Unsupported content type: {}", content_type))
    }
}

// =============================================================================================================================
