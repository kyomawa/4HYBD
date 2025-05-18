use actix_web::{
    HttpRequest, HttpResponse, Responder, delete, get, post, put,
    web::{self, Data, Json, Path, ServiceConfig},
};
use mongodb::Database;

use crate::{
    models::group_model::{AddGroupMembers, CreateGroup, UpdateGroup},
    services::group_service,
    utils::{
        api_response::ApiResponse,
        jwt::get_authenticated_user,
    },
};

// =============================================================================================================================

pub fn group_routes(cfg: &mut ServiceConfig) {
    let scope = web::scope("/groups")
        .service(get_groups)
        .service(get_group_by_id)
        .service(create_group)
        .service(update_group)
        .service(add_group_members)
        .service(remove_group_member)
        .service(delete_group);

    cfg.service(scope);
}

// =============================================================================================================================

#[get("")]
async fn get_groups(db: Data<Database>, req: HttpRequest) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    match group_service::get_user_groups(&db, jwt_payload.user_id).await {
        Ok(groups) => {
            let response = ApiResponse::success("Groups retrieved successfully", groups);
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve groups", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[get("/{group_id}")]
async fn get_group_by_id(db: Data<Database>, req: HttpRequest, group_id: Path<String>) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();

    match group_service::get_group_by_id(&db, group_id, jwt_payload.user_id).await {
        Ok(group) => {
            let response = ApiResponse::success("Group retrieved successfully", group);
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to retrieve group", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("")]
async fn create_group(db: Data<Database>, req: HttpRequest, payload: Json<CreateGroup>) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let data = payload.into_inner();

    match group_service::create_group(&db, data, jwt_payload.user_id).await {
        Ok(group) => {
            let response = ApiResponse::success("Group created successfully", group);
            HttpResponse::Created().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to create group", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[put("/{group_id}")]
async fn update_group(
    db: Data<Database>,
    req: HttpRequest,
    group_id: Path<String>,
    payload: Json<UpdateGroup>
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();
    let data = payload.into_inner();

    match group_service::update_group(&db, group_id, data, jwt_payload.user_id).await {
        Ok(group) => {
            let response = ApiResponse::success("Group updated successfully", group);
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to update group", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[post("/{group_id}/members")]
async fn add_group_members(
    db: Data<Database>,
    req: HttpRequest,
    group_id: Path<String>,
    payload: Json<AddGroupMembers>
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();
    let data = payload.into_inner();

    match group_service::add_group_members(&db, group_id, data, jwt_payload.user_id).await {
        Ok(group) => {
            let response = ApiResponse::success("Members added to group successfully", group);
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to add members to group", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[delete("/{group_id}/members/{user_id}")]
async fn remove_group_member(
    db: Data<Database>,
    req: HttpRequest,
    path: Path<(String, String)>
) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let (group_id, member_id) = path.into_inner();

    match group_service::remove_group_member(&db, group_id, member_id, jwt_payload.user_id).await {
        Ok(group) => {
            let response = ApiResponse::success("Member removed from group successfully", group);
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to remove member from group", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================

#[delete("/{group_id}")]
async fn delete_group(db: Data<Database>, req: HttpRequest, group_id: Path<String>) -> impl Responder {
    let jwt_payload = match get_authenticated_user(&req) {
        Ok(payload) => payload,
        Err(err_res) => return err_res,
    };

    let group_id = group_id.into_inner();

    match group_service::delete_group(&db, group_id, jwt_payload.user_id).await {
        Ok(_) => {
            let response = ApiResponse::success("Group deleted successfully", ());
            HttpResponse::Ok().json(response)
        },
        Err(e) => {
            let response = ApiResponse::error("Failed to delete group", e.to_string());
            HttpResponse::InternalServerError().json(response)
        }
    }
}

// =============================================================================================================================
