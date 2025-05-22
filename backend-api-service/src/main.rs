use actix_cors::Cors;
use actix_web::{App, HttpServer, http, web};
use controllers::routes;
use db::Db;
use extractor::deserialize_error_extractor;
use services::file_service;

mod controllers;
mod db;
mod extractor;
mod models;
mod services;
mod utils;

// =============================================================================================================================

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();

    let db = Db::init("DATABASE_URL")
        .await
        .expect("❌ Failed to connect to database");

    let external_host_ip =
        std::env::var("EXTERNAL_HOST_IP").expect("Missing EXTERNAL_HOST_IP env.");

    println!("🚀 Initializing MinIO bucket...");
    if let Err(e) = file_service::create_bucket_if_not_exists().await {
        println!("⚠️ Warning: Failed to initialize MinIO bucket: {}", e);
        println!("📋 The application will continue, but file uploads may fail.");
    }

    println!("🌐 Starting HTTP server on 0.0.0.0:8080...");

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:8100")
            .allowed_origin(&format!("http://{}:8100", external_host_ip.clone()))
            .allowed_origin(&format!("http://{}", external_host_ip.clone()))
            .allowed_origin(&external_host_ip)
            .allowed_origin("capacitor://localhost")
            .allowed_origin("http://localhost")
            .allowed_origin_fn(|origin, _req_head| origin.as_bytes().starts_with(b"http://"))
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "PATCH"])
            .allowed_headers(vec![
                http::header::AUTHORIZATION,
                http::header::CONTENT_TYPE,
            ])
            .allowed_header(http::header::CONTENT_TYPE)
            .supports_credentials()
            .max_age(3600);

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(db.clone()))
            .configure(routes)
            .app_data(deserialize_error_extractor())
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

// =============================================================================================================================
