use actix_web::{App, HttpServer, web};
use controllers::routes;
use db::Db;

mod controllers;
mod db;
mod models;
mod services;
mod utils;

// =============================================================================================================================

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();

    let db = Db::new("DATABASE_URL")
        .await
        .expect("❌ Failed to connect to database");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db.clone()))
            .configure(routes)
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

// =============================================================================================================================
