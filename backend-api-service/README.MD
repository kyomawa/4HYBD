# Snapshoot Backend API Service

## Overview

The Snapshoot Backend API Service is the core backend for the Snapshoot social media application, providing a comprehensive set of APIs for managing user accounts, social interactions, messaging, stories, and geolocation features. It handles:

- User authentication and account management
- Friend connections and relationship management
- Direct and group messaging with multimedia support
- Location-based content discovery and user finding
- Story sharing with geographic context
- Media file storage and retrieval

This service is designed with a microservice architecture approach, providing RESTful endpoints for the mobile application to interact with.

## Technologies

- Rust (Edition 2024)
- Actix-web 4.10.2 (Web framework)
- MongoDB 3.2.3 (Database)
- JWT Authentication
- MinIO (Object storage for multimedia files)
- Docker & Docker Compose (Containerization)
- Traefik (Reverse proxy and load balancer)

## API Endpoints

### Health Check

#### `GET /api/health`

Checks the health status of the service.

**Response:**

- `200 OK`: Service is running correctly

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/health
```

### Auth Controller

#### `POST /api/auth/register`

Registers a new user in the system.

**Request Body:**

```json
{
  "username": "username",
  "email": "user@example.com",
  "password": "password123",
  "bio": "User bio text",
  "location": {
    "type": "Point",
    "coordinates": [4.8156, 45.7107]
  }
}
```

**Responses:**

- `200 OK`: Registration successful, returns authentication token
- `400 Bad Request`: Invalid registration data
- `409 Conflict`: Username or email already exists
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "SecurePassword123",
    "bio": "Hello, I am a new user!",
    "location": {
      "type": "Point",
      "coordinates": [4.8156, 45.7107]
    }
  }'
```

#### `POST /api/auth/login`

Authenticates a user and provides a JWT token.

**Request Body:**

```json
{
  "credential": "username_or_email",
  "password": "password123"
}
```

**Responses:**

- `200 OK`: Login successful, returns authentication token
- `400 Bad Request`: Invalid login credentials
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "username_or_email",
    "password": "password123"
  }'
```

#### `GET /api/auth/me`

Retrieves the current authenticated user's JWT payload.

**Authentication:** Required

**Responses:**

- `200 OK`: Returns user JWT payload
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/auth/me \
  -H "Authorization: Bearer {token}"
```

### User Controller

#### `GET /api/users`

Retrieves all users in the system.

**Authentication:** Required (Admin role)

**Responses:**

- `200 OK`: Returns a list of all user profiles
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/users \
  -H "Authorization: Bearer {token}"
```

#### `GET /api/users/me`

Retrieves the current authenticated user's profile.

**Authentication:** Required

**Responses:**

- `200 OK`: Returns user profile
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/users/me \
  -H "Authorization: Bearer {token}"
```

#### `GET /api/users/{id}`

Retrieves a specific user by ID.

**Authentication:** Required

**Path Parameters:**

- `id` (string, required): User ID

**Responses:**

- `200 OK`: Returns user profile
- `401 Unauthorized`: Authentication required
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/users/000000000000000000000001 \
  -H "Authorization: Bearer {token}"
```

#### `POST /api/users`

Creates a new user (admin only).

**Authentication:** Required (Admin role)

**Request Body:**

```json
{
  "username": "username",
  "email": "user@example.com",
  "password": "password123",
  "role": "User",
  "bio": "User bio text",
  "location": {
    "type": "Point",
    "coordinates": [4.8156, 45.7107]
  }
}
```

**Responses:**

- `200 OK`: Returns created user profile
- `400 Bad Request`: Invalid user data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Username or email already exists
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/users \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "User",
    "bio": "New user created by admin",
    "location": {
      "type": "Point",
      "coordinates": [4.8156, 45.7107]
    }
  }'
```

#### `PUT /api/users/me`

Updates the current authenticated user's profile.

**Authentication:** Required

**Request Body:**

```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "password": "updated_password",
  "bio": "Updated bio",
  "location": {
    "type": "Point",
    "coordinates": [4.8156, 45.7107]
  }
}
```

**Responses:**

- `200 OK`: Returns updated user profile
- `400 Bad Request`: Invalid user data
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X PUT http://localhost:80/api/users/me \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "updated_username",
    "email": "updated@example.com",
    "password": "updated_password",
    "bio": "Updated bio",
    "location": {
      "type": "Point",
      "coordinates": [4.8156, 45.7107]
    }
  }'
```

#### `PUT /api/users/{id}`

Updates a specific user's profile (admin only).

**Authentication:** Required (Admin role)

**Path Parameters:**

- `id` (string, required): User ID

**Request Body:**

```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "password": "updated_password",
  "role": "User",
  "bio": "Updated bio",
  "location": {
    "type": "Point",
    "coordinates": [4.8156, 45.7107]
  }
}
```

**Responses:**

- `200 OK`: Returns updated user profile
- `400 Bad Request`: Invalid user data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X PUT http://localhost:80/api/users/000000000000000000000002 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "updated_username",
    "email": "updated@example.com",
    "password": "updated_password",
    "role": "User",
    "bio": "Updated bio",
    "location": {
      "type": "Point",
      "coordinates": [4.8156, 45.7107]
    }
  }'
```

#### `DELETE /api/users/me`

Deletes the current authenticated user's account.

**Authentication:** Required

**Responses:**

- `200 OK`: User successfully deleted
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/users/me \
  -H "Authorization: Bearer {token}"
```

#### `DELETE /api/users/{id}`

Deletes a specific user (admin only).

**Authentication:** Required (Admin role)

**Path Parameters:**

- `id` (string, required): User ID

**Responses:**

- `200 OK`: User successfully deleted
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/users/000000000000000000000002 \
  -H "Authorization: Bearer {token}"
```

### Friend Controller

#### `GET /api/friends`

Retrieves all friends of the current authenticated user.

**Authentication:** Required

**Responses:**

- `200 OK`: Returns a list of friend profiles
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/friends \
  -H "Authorization: Bearer {token}"
```

#### `GET /api/friends/requests`

Retrieves all pending friend requests for the current authenticated user.

**Authentication:** Required

**Responses:**

- `200 OK`: Returns a list of friend requests
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/friends/requests \
  -H "Authorization: Bearer {token}"
```

#### `POST /api/friends/find`

Finds a user by email or ID.

**Authentication:** Required

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

OR

```json
{
  "user_id": "000000000000000000000002"
}
```

**Responses:**

- `200 OK`: Returns found user profile
- `400 Bad Request`: Invalid search parameters
- `401 Unauthorized`: Authentication required
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/friends/find \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

#### `POST /api/friends/request/{user_id}`

Sends a friend request to a user.

**Authentication:** Required

**Path Parameters:**

- `user_id` (string, required): User ID to send request to

**Responses:**

- `200 OK`: Friend request sent successfully
- `400 Bad Request`: Invalid user ID or already friends
- `401 Unauthorized`: Authentication required
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/friends/request/000000000000000000000002 \
  -H "Authorization: Bearer {token}"
```

#### `PATCH /api/friends/accept/{request_id}`

Accepts a friend request.

**Authentication:** Required

**Path Parameters:**

- `request_id` (string, required): Friend request ID

**Responses:**

- `200 OK`: Friend request accepted successfully
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Friend request not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X PATCH http://localhost:80/api/friends/accept/{request_id} \
  -H "Authorization: Bearer {token}"
```

#### `DELETE /api/friends/{user_id}`

Removes a friend connection.

**Authentication:** Required

**Path Parameters:**

- `user_id` (string, required): User ID to remove from friends

**Responses:**

- `200 OK`: Friend removed successfully
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Friend connection not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/friends/000000000000000000000002 \
  -H "Authorization: Bearer {token}"
```

### Message Controller

#### `GET /api/messages/{recipient_id}`

Retrieves direct messages with a specific user.

**Authentication:** Required

**Path Parameters:**

- `recipient_id` (string, required): User ID of the conversation partner

**Query Parameters:**

- `limit` (int, optional): Maximum number of messages to return (default: 50)
- `offset` (int, optional): Number of messages to skip (default: 0)

**Responses:**

- `200 OK`: Returns list of messages
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET "http://localhost:80/api/messages/000000000000000000000002?limit=50&offset=0" \
  -H "Authorization: Bearer {token}"
```

#### `POST /api/messages/{recipient_id}`

Sends a direct message to a user.

**Authentication:** Required

**Path Parameters:**

- `recipient_id` (string, required): User ID of the recipient

**Request Body:**

```json
{
  "content": "Message text",
  "media": null
}
```

**Responses:**

- `201 Created`: Message sent successfully
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Recipient not found or not a friend
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/messages/000000000000000000000002 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello, how are you?",
    "media": null
  }'
```

#### `POST /api/messages/{recipient_id}/media`

Sends a direct message with media attachment.

**Authentication:** Required

**Path Parameters:**

- `recipient_id` (string, required): User ID of the recipient

**Query Parameters:**

- `text_content` (string, optional): Text to include with media

**Headers:**

- `Content-Type`: Media MIME type (image/jpeg, video/mp4, etc.)

**Body:**

- Raw binary data of the media file

**Responses:**

- `201 Created`: Message with media sent successfully
- `400 Bad Request`: Invalid media type or size
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Recipient not found or not a friend
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST "http://localhost:80/api/messages/000000000000000000000002/media?text_content=Check%20this%20out!" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/image.jpg
```

#### `GET /api/messages/groups/{group_id}`

Retrieves messages from a group.

**Authentication:** Required

**Path Parameters:**

- `group_id` (string, required): Group ID

**Query Parameters:**

- `limit` (int, optional): Maximum number of messages to return (default: 50)
- `offset` (int, optional): Number of messages to skip (default: 0)

**Responses:**

- `200 OK`: Returns list of group messages
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Group not found or user not a member
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET "http://localhost:80/api/messages/groups/000000000000000000000003?limit=50&offset=0" \
  -H "Authorization: Bearer {token}"
```

#### `POST /api/messages/groups/{group_id}`

Sends a message to a group.

**Authentication:** Required

**Path Parameters:**

- `group_id` (string, required): Group ID

**Request Body:**

```json
{
  "content": "Message text",
  "media": null
}
```

**Responses:**

- `201 Created`: Group message sent successfully
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Group not found or user not a member
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/messages/groups/000000000000000000000003 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello everyone!",
    "media": null
  }'
```

#### `POST /api/messages/groups/{group_id}/media`

Sends a message with media attachment to a group.

**Authentication:** Required

**Path Parameters:**

- `group_id` (string, required): Group ID

**Query Parameters:**

- `text_content` (string, optional): Text to include with media

**Headers:**

- `Content-Type`: Media MIME type (image/jpeg, video/mp4, etc.)

**Body:**

- Raw binary data of the media file

**Responses:**

- `201 Created`: Group message with media sent successfully
- `400 Bad Request`: Invalid media type or size
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Group not found or user not a member
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST "http://localhost:80/api/messages/groups/000000000000000000000003/media?text_content=Check%20this%20out!" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: video/mp4" \
  --data-binary @/path/to/video.mp4
```

#### `DELETE /api/messages/{message_id}`

Deletes a message.

**Authentication:** Required

**Path Parameters:**

- `message_id` (string, required): Message ID to delete

**Responses:**

- `200 OK`: Message deleted successfully
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Message not found or not the sender
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/messages/{message_id} \
  -H "Authorization: Bearer {token}"
```

### Group Controller

#### `GET /api/groups`

Retrieves all groups the current authenticated user belongs to.

**Authentication:** Required

**Responses:**

- `200 OK`: Returns list of groups
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/groups \
  -H "Authorization: Bearer {token}"
```

#### `GET /api/groups/{group_id}`

Retrieves a specific group by ID.

**Authentication:** Required

**Path Parameters:**

- `group_id` (string, required): Group ID

**Responses:**

- `200 OK`: Returns group details
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Group not found or user not a member
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/groups/000000000000000000000003 \
  -H "Authorization: Bearer {token}"
```

#### `POST /api/groups`

Creates a new group.

**Authentication:** Required

**Request Body:**

```json
{
  "name": "Group Name",
  "members": ["000000000000000000000002"]
}
```

**Responses:**

- `201 Created`: Group created successfully
- `400 Bad Request`: Invalid group data
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/groups \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Group",
    "members": ["000000000000000000000002"]
  }'
```

#### `PUT /api/groups/{group_id}`

Updates a group's details.

**Authentication:** Required (Group creator or admin)

**Path Parameters:**

- `group_id` (string, required): Group ID

**Request Body:**

```json
{
  "name": "Updated Group Name"
}
```

**Responses:**

- `200 OK`: Group updated successfully
- `400 Bad Request`: Invalid group data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not the group creator or admin
- `404 Not Found`: Group not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X PUT http://localhost:80/api/groups/000000000000000000000003 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Group Name"
  }'
```

#### `POST /api/groups/{group_id}/members`

Adds members to a group.

**Authentication:** Required (Group creator or admin)

**Path Parameters:**

- `group_id` (string, required): Group ID

**Request Body:**

```json
{
  "members": ["user_id_1", "user_id_2"]
}
```

**Responses:**

- `200 OK`: Members added successfully
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not the group creator or admin
- `404 Not Found`: Group not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/groups/000000000000000000000003/members \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "members": ["user_id_1", "user_id_2"]
  }'
```

#### `DELETE /api/groups/{group_id}/members/{user_id}`

Removes a member from a group.

**Authentication:** Required (Group creator, admin, or self-removal)

**Path Parameters:**

- `group_id` (string, required): Group ID
- `user_id` (string, required): User ID to remove

**Responses:**

- `200 OK`: Member removed successfully
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not authorized to remove this member
- `404 Not Found`: Group or member not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/groups/000000000000000000000003/members/000000000000000000000002 \
  -H "Authorization: Bearer {token}"
```

#### `DELETE /api/groups/{group_id}`

Deletes a group.

**Authentication:** Required (Group creator or admin)

**Path Parameters:**

- `group_id` (string, required): Group ID

**Responses:**

- `200 OK`: Group deleted successfully
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not the group creator or admin
- `404 Not Found`: Group not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/groups/000000000000000000000003 \
  -H "Authorization: Bearer {token}"
```

### Story Controller

#### `GET /api/stories`

Retrieves stories from the current user's friends.

**Authentication:** Required

**Responses:**

- `200 OK`: Returns list of stories
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/stories \
  -H "Authorization: Bearer {token}"
```

#### `GET /api/stories/nearby`

Retrieves stories near a geographic location.

**Authentication:** Required

**Query Parameters:**

- `latitude` (float, required): Latitude coordinate
- `longitude` (float, required): Longitude coordinate
- `radius` (float, optional): Search radius in meters (default: 5000)

**Responses:**

- `200 OK`: Returns list of nearby stories
- `400 Bad Request`: Invalid coordinates
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET "http://localhost:80/api/stories/nearby?latitude=45.7107&longitude=4.8156&radius=5000" \
  -H "Authorization: Bearer {token}"
```

#### `POST /api/stories`

Creates a new story with an existing media URL.

**Authentication:** Required

**Request Body:**

```json
{
  "media": {
    "media_type": "Image",
    "url": "http://localhost:9000/snapshoot-media/example.jpg",
    "duration": null
  },
  "location": {
    "type": "Point",
    "coordinates": [4.8156, 45.7107]
  }
}
```

**Responses:**

- `201 Created`: Story created successfully
- `400 Bad Request`: Invalid story data
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/stories \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "media": {
      "media_type": "Image",
      "url": "http://localhost:9000/snapshoot-media/example.jpg",
      "duration": null
    },
    "location": {
      "type": "Point",
      "coordinates": [4.8156, 45.7107]
    }
  }'
```

#### `POST /api/stories/media`

Creates a new story with direct media upload.

**Authentication:** Required

**Query Parameters:**

- `type` (string, required): Location type ("Point")
- `coordinates` (array, required): Location coordinates [longitude, latitude]

**Headers:**

- `Content-Type`: Media MIME type (image/jpeg, video/mp4, etc.)

**Body:**

- Raw binary data of the media file

**Responses:**

- `201 Created`: Story created successfully
- `400 Bad Request`: Invalid media type, size, or location data
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST "http://localhost:80/api/stories/media?type=Point&coordinates=[4.8156,45.7107]" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: image/jpeg" \
  --data-binary @/path/to/image.jpg
```

#### `GET /api/stories/{story_id}`

Retrieves a specific story by ID.

**Authentication:** Required

**Path Parameters:**

- `story_id` (string, required): Story ID

**Responses:**

- `200 OK`: Returns story details
- `401 Unauthorized`: Authentication required
- `404 Not Found`: Story not found or access denied
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET http://localhost:80/api/stories/{story_id} \
  -H "Authorization: Bearer {token}"
```

#### `DELETE /api/stories/{story_id}`

Deletes a story.

**Authentication:** Required (Story creator or admin)

**Path Parameters:**

- `story_id` (string, required): Story ID

**Responses:**

- `200 OK`: Story deleted successfully
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Not the story creator or admin
- `404 Not Found`: Story not found
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X DELETE http://localhost:80/api/stories/{story_id} \
  -H "Authorization: Bearer {token}"
```

### Location Controller

#### `POST /api/location/update`

Updates the current user's geographic location.

**Authentication:** Required

**Request Body:**

```json
{
  "location": {
    "type": "Point",
    "coordinates": [4.8156, 45.7107]
  }
}
```

**Responses:**

- `200 OK`: Location updated successfully
- `400 Bad Request`: Invalid location data
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X POST http://localhost:80/api/location/update \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "location": {
      "type": "Point",
      "coordinates": [4.8156, 45.7107]
    }
  }'
```

#### `GET /api/location/nearby/users`

Finds users near a geographic location.

**Authentication:** Required

**Query Parameters:**

- `longitude` (float, required): Longitude coordinate
- `latitude` (float, required): Latitude coordinate
- `radius` (float, optional): Search radius in meters (default: 5000)
- `limit` (int, optional): Maximum number of users to return (default: 50)

**Responses:**

- `200 OK`: Returns list of nearby users
- `400 Bad Request`: Invalid coordinates
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error with error message

**Usage Example:**

```bash
curl -X GET "http://localhost:80/api/location/nearby/users?longitude=4.8156&latitude=45.7107&radius=5000&limit=50" \
  -H "Authorization: Bearer {token}"
```

## Data Models

### User

```rust
pub struct User {
    pub id: Option<ObjectId>,
    pub username: String,
    pub email: String,
    pub password: String,
    pub role: UserRole,
    pub bio: String,
    pub avatar: Option<String>,
    pub location: Location,
}
```

### UserRole (Enum)

```rust
pub enum UserRole {
    User,
    Admin,
}
```

### Friend

```rust
pub struct Friend {
    pub id: Option<ObjectId>,
    pub status: FriendStatus,
    pub user_id: ObjectId,
    pub friend_id: ObjectId,
}
```

### FriendStatus (Enum)

```rust
pub enum FriendStatus {
    Pending,
    Accepted,
}
```

### Message

```rust
pub struct Message {
    pub id: Option<ObjectId>,
    pub content: String,
    pub sender_id: ObjectId,
    pub recipient_id: ObjectId,
    pub is_group: bool,
    pub media: Option<Media>,
    pub read: bool,
}
```

### Media

```rust
pub struct Media {
    pub media_type: MediaType,
    pub url: String,
    pub duration: Option<f64>,
}
```

### MediaType (Enum)

```rust
pub enum MediaType {
    Image,
    Video,
}
```

### Group

```rust
pub struct Group {
    pub id: Option<ObjectId>,
    pub name: String,
    pub creator_id: ObjectId,
    pub members: Vec<ObjectId>,
}
```

### Story

```rust
pub struct Story {
    pub id: Option<ObjectId>,
    pub user_id: ObjectId,
    pub location: Location,
    pub media: Media,
    pub expires_at: DateTime<Utc>,
}
```

### Location

```rust
pub struct Location {
    pub location_type: String, // Usually "Point"
    pub coordinates: [f64; 2], // [longitude, latitude]
}
```

## Architecture

### MVC Pattern

The service follows the Model-View-Controller (MVC) architectural pattern:

- **Models**: Define data structures and validation rules
- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic and data manipulation

### Repository Pattern

Each service module interacts with the database through repositories:

```rust
// Example repository pattern for user service
pub async fn get_user_by_id(db: &Database, id: String) -> Result<User, Box<dyn Error>> {
    let id = ObjectId::from_str(&id)?;
    let collection: Collection<User> = db.collection(COLLECTION_NAME);
    let filter = doc! {
      "_id": id
    };
    match collection.find_one(filter).await? {
        Some(user) => Ok(user),
        None => Err("No user found with the given id".into()),
    }
}
```

### Authentication Middleware

JWT-based authentication is implemented as middleware:

```rust
// JWT verification and role-based access control
pub fn user_has_any_of_these_roles(
    req: &HttpRequest,
    roles: &[UserRole],
) -> Result<ExternalClaims, HttpResponse> {
    let jwt_payload = get_authenticated_user(req)?;

    if roles.contains(&jwt_payload.role) {
        Ok(jwt_payload)
    } else {
        let response = ApiResponse::error(
            "Access denied: insufficient role",
            Some("User role is not allowed"),
        );
        Err(HttpResponse::Unauthorized().json(response))
    }
}
```

### MinIO Integration for Media Storage

The service integrates with MinIO for storing and retrieving media files:

```rust
pub async fn upload_file(file_data: &[u8], content_type: &str) -> Result<String, Box<dyn Error>> {
    let file_name = format!("{}.{}", Uuid::new_v4(), file_extension_from_type(content_type));
    let url = format!("{}/{}/{}", *MINIO_URL, BUCKET_NAME, file_name);

    let client = Client::new();
    let response = client.put(&url)
        .header("Content-Type", content_type)
        .body(file_data.to_vec())
        .basic_auth(&*MINIO_ACCESS_KEY, Some(&*MINIO_SECRET_KEY))
        .send()
        .await?;

    if response.status() != StatusCode::OK && response.status() != StatusCode::CREATED && response.status() != StatusCode::NO_CONTENT {
        return Err(format!("Failed to upload file: {} - {}", response.status(), response.text().await?).into());
    }

    Ok(url)
}
```

## Development

To run the service locally:

1. Clone the repository
2. Set up environment variables in `.env` file
3. Run Docker Compose:

```bash
docker-compose up
```

The API will be available at `http://localhost/api/`.
