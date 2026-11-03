
require("dotenv").config();
const mongoose = require("mongoose");

const COLLECTIONS = [
  "listings",
  "reservations",
  "reviews",
  "users",
  "wishlists",
];

const LOCAL_URI = process.env.MONGODB_URI;
const ATLAS_URI = process.env.ATLASDB_URL;

async function connect(uri, name) {
  if (!uri) throw new Error(`${name} connection string is missing`);

  const connection = mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 15000,
  });

  await connection.asPromise();
  console.log(`${name} connected`);

  return connection;
}

async function migrate() {
  let source;
  let target;
  let createdCollections = [];

  try {
    source = await connect(LOCAL_URI, "Local MongoDB");
    target = await connect(ATLAS_URI, "MongoDB Atlas");

    const sourceDb = source.db;
    const targetDb = target.db;

    if (sourceDb.databaseName !== "WL-2") {
      throw new Error(
        `Unexpected source database: ${sourceDb.databaseName}`,
      );
    }

    if (targetDb.databaseName !== "WL-2") {
      throw new Error(
        `Unexpected destination database: ${targetDb.databaseName}`,
      );
    }

    console.log("\nChecking destination database...");

    const existing = await targetDb
      .listCollections({}, { nameOnly: true })
      .toArray();

    if (existing.length > 0) {
      throw new Error(
        "Atlas WL-2 is not empty. Migration stopped to prevent overwriting data.",
      );
    }

    console.log("Atlas destination is empty. Safe to proceed.\n");

    let totalDocuments = 0;

    for (const name of COLLECTIONS) {
      const sourceCollection = sourceDb.collection(name);
      const targetCollection = await targetDb.createCollection(name);

      createdCollections.push(name);

      const documents = await sourceCollection.find({}).toArray();

      if (documents.length > 0) {
        await targetCollection.insertMany(documents, {
          ordered: true,
        });
      }

      // Recreate existing indexes, excluding the automatic _id index.
      const indexes = await sourceCollection.listIndexes().toArray();

      for (const index of indexes) {
        if (index.name === "_id_") continue;

        const options = { ...index };
        delete options.key;
        delete options.ns;
        delete options.v;
        delete options.background;

        await targetCollection.createIndex(index.key, options);
      }

      const copiedCount = await targetCollection.countDocuments();

      if (copiedCount !== documents.length) {
        throw new Error(
          `Verification failed for ${name}: expected ${documents.length}, found ${copiedCount}`,
        );
      }

      totalDocuments += copiedCount;

      console.log(
        `✓ ${name}: ${copiedCount} documents copied and verified`,
      );
    }

    console.log("\nMigration completed successfully!");
    console.log(`Total documents copied: ${totalDocuments}`);
    console.log(`Destination database: ${targetDb.databaseName}`);
  } catch (error) {
    console.error("\nMigration failed:", error.message);

    // Remove only collections created by this migration attempt.
    if (target && createdCollections.length > 0) {
      console.log("Cleaning up partially migrated collections...");

      for (const name of createdCollections.reverse()) {
        try {
          await target.db.dropCollection(name);
          console.log(`Removed partial collection: ${name}`);
        } catch (cleanupError) {
          console.error(
            `Could not remove ${name}:`,
            cleanupError.message,
          );
        }
      }
    }

    process.exitCode = 1;
  } finally {
    if (source) await source.close();
    if (target) await target.close();
  }
}

migrate();
