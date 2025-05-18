use actix_web::{App, HttpServer, web};
use controllers::routes;
use db::Db;
use extractor::deserialize_error_extractor;

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

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db.clone()))
            .configure(routes)
            .app_data(deserialize_error_extractor())
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

// =============================================================================================================================
