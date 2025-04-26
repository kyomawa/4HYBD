print("⚡ Script: Indexes creation for snapshoot database...");

// Connexion à la base de données Snapshoot
db = db.getSiblingDB("snapshoot");

// 1. Collection USERS
print("🚧 Creating indexes for users collection...");
db.users.createIndex(
  { email: 1 },
  { unique: true }
);
db.users.createIndex(
  { username: 1 },
  { unique: true }
);

// 2. Collection FRIENDS
print("🚧 Creating indexes for friends collection...");
db.friends.createIndex(
  { user_id: 1, friend_id: 1 },
  { unique: true }
);
db.friends.createIndex({ user_id: 1 });
db.friends.createIndex({ friend_id: 1 });
db.friends.createIndex({ status: 1 });

// 3. Collection DIRECT_MESSAGES
print("🚧 Creating indexes for direct_messages collection...");
db.direct_messages.createIndex({ sender_id: 1 });
db.direct_messages.createIndex({ recipient_id: 1 });
db.direct_messages.createIndex(
  { sender_id: 1, recipient_id: 1, created_at: -1 }
);
db.direct_messages.createIndex({ media_id: 1 });

// 4. Collection GROUPS
print("🚧 Creating indexes for groups collection...");
db.groups.createIndex({ creator_id: 1 });
db.groups.createIndex({ members: 1 });
db.groups.createIndex({ admins: 1 });

// 5. Collection GROUP_MESSAGES
print("🚧 Creating indexes for group_messages collection...");
db.group_messages.createIndex({ group_id: 1 });
db.group_messages.createIndex({ sender_id: 1 });
db.group_messages.createIndex(
  { group_id: 1, created_at: -1 }
);
db.group_messages.createIndex({ media_id: 1 });

// 6. Collection MEDIA
print("🚧 Creating indexes for media collection...");
db.media.createIndex({ user_id: 1 });
db.media.createIndex({ type: 1 });
db.media.createIndex({ created_at: 1 });

// 7. Collection STORIES
print("🚧 Creating indexes for stories collection...");
db.stories.createIndex({ user_id: 1 });
db.stories.createIndex({ media_id: 1 });
db.stories.createIndex({ expires_at: 1 });
db.stories.createIndex(
  { "location.coordinates": "2dsphere" }
);
db.stories.createIndex({ views: 1 });

// 8. Collection LOCATIONS
print("🚧 Creating indexes for locations collection...");
db.locations.createIndex(
  { user_id: 1 },
  { unique: true }
);
db.locations.createIndex(
  { "location.coordinates": "2dsphere" }
);
db.locations.createIndex({ share_with: 1 });

print("✅ All indexes were successfully created !");