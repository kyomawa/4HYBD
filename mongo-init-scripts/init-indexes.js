print("⚡ Script: Indexes creation for snapshoot database...");

// Connexion à la base de données Snapshoot
db = db.getSiblingDB("snapshoot");

// 1. Collection USERS
print("🚧 Creating indexes for users collection...");
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ "location.coordinates": "2dsphere" });
db.users.createIndex({ role: 1 });

// 2. Collection FRIENDS
print("🚧 Creating indexes for friends collection...");
db.friends.createIndex({ user_id: 1, friend_id: 1 }, { unique: true });
db.friends.createIndex({ user_id: 1 });
db.friends.createIndex({ friend_id: 1 });
db.friends.createIndex({ status: 1 });

// 3. Collection MESSAGES
print("🚧 Creating indexes for messages collection...");
db.messages.createIndex({ sender_id: 1 });
db.messages.createIndex({ recipient_id: 1 });
db.messages.createIndex({ is_group: 1 });
db.messages.createIndex({ sender_id: 1, recipient_id: 1, is_group: 1 });
db.messages.createIndex({ recipient_id: 1, is_group: 1 });
db.messages.createIndex({ read: 1 });
db.messages.createIndex({ "media.type": 1 });

// 4. Collection GROUPS
print("🚧 Creating indexes for groups collection...");
db.groups.createIndex({ creator_id: 1 });
db.groups.createIndex({ members: 1 });
db.groups.createIndex({ name: 1 });

// 5. Collection STORIES
print("🚧 Creating indexes for stories collection...");
db.stories.createIndex({ user_id: 1 });
db.stories.createIndex({ expires_at: 1 });
db.stories.createIndex({ "location.coordinates": "2dsphere" });
db.stories.createIndex({ "media.type": 1 });

print("✅ All indexes were successfully created !");
