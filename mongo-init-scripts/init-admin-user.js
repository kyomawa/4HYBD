print("⚡ Script: Creating admin user for snapshoot database...");

// Connexion à la base de données Snapshoot
db = db.getSiblingDB("snapshoot");

// Créer un utilisateur admin avec un ObjectId prédéfini
const adminId = ObjectId("000000000000000000000001");
const adminExists = db.users.findOne({ _id: adminId });

if (!adminExists) {
  print("🚧 Creating admin user...");

  // Ce hachage correspond au mot de passe "admin" avec bcrypt
  const hashedPassword =
    "$2a$12$gF17hZWhsqAMHnBWRaK25e1F4RTVGCDNKjEMZrtfo6NsZP3TE5z6G";

  db.users.insertOne({
    _id: adminId,
    username: "admin",
    email: "admin@snapshoot.com",
    password: hashedPassword,
    bio: "Administrateur du système",
    role: "Admin",
    location: {
      type: "Point",
      coordinates: [4.8156, 45.7107],
    },
  });

  print("✅ Admin user created successfully!");
} else {
  print("ℹ️ Admin user already exists, skipping creation.");
}

// Créer un utilisateur test avec un ObjectId prédéfini
const testUserId = ObjectId("000000000000000000000002");
const testUserExists = db.users.findOne({ _id: testUserId });

if (!testUserExists) {
  print("🚧 Creating test user...");

  // Utiliser un hachage bcrypt du mot de passe "test"
  const hashedPassword =
    "$2a$12$EDofS6cpfTs5.vmigyIUU.Jvzm3Q8Ww32EHyu4fIzFQZxhduHq0t6";

  db.users.insertOne({
    _id: testUserId,
    username: "testuser",
    email: "test@snapshoot.com",
    password: hashedPassword,
    bio: "Utilisateur de test",
    role: "User",
    location: {
      type: "Point",
      coordinates: [4.8156, 45.7107],
    },
  });

  print("✅ Test user created successfully!");
} else {
  print("ℹ️ Test user already exists, skipping creation.");
}

// Créer un groupe de test avec un ObjectId prédéfini
const groupId = ObjectId("000000000000000000000003");
const groupExists = db.groups.findOne({ _id: groupId });

if (!groupExists) {
  print("🚧 Creating test group...");

  db.groups.insertOne({
    _id: groupId,
    name: "Groupe Test",
    creator_id: adminId,
    members: [adminId, testUserId],
  });

  print("✅ Test group created successfully!");
} else {
  print("ℹ️ Test group already exists, skipping creation.");
}

print("✅ Initialization completed successfully!");
