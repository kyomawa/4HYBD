use serde::Serialize;

// =============================================================================================================================

#[derive(Debug, Serialize)]
pub struct ApiResponse<'a, T> {
    success: bool,
    message: &'a str,

    #[serde(skip_serializing_if = "Option::is_none")]
    data: Option<T>,

    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<T>,
}

// =============================================================================================================================

impl<'a, T> ApiResponse<'a, T> {
    pub fn success(message: &'a str, data: T) -> Self {
        Self {
            success: true,
            message,
            data: Some(data),
            error: None,
        }
    }

    pub fn error(message: &'a str, error: T) -> Self {
        Self {
            success: false,
            message,
            data: None,
            error: Some(error),
        }
    }
}

// =============================================================================================================================
