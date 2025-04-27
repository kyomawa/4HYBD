use mongodb::{Client, Database, options::ClientOptions};
use std::error::Error;

// =============================================================================================================================

#[derive(Clone)]
pub struct Db {}

impl Db {
    pub async fn new(uri: &str) -> Result<Database, Box<dyn Error>> {
        let client_options = ClientOptions::parse(std::env::var(uri).expect(
            format!("❌ No env variable called {uri} was found in the .env file.").as_str(),
        ))
        .await?;

        let client = Client::with_options(client_options)?;

        Ok(client.database("snapshoot"))
    }
}

// =============================================================================================================================
