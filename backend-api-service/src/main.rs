use actix_web::{App, HttpServer, Responder, get};

#[get("/api/health")]
async fn healthcheck() -> impl Responder {
    "🟢 Backend Service is Alive"
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| App::new().service(healthcheck))
        .bind(("0.0.0.0", 8080))?
        .run()
        .await
}
