import { MongoClient } from 'mongodb';

const sourceUri = process.env.SOURCE_MONGO_URI || 'mongodb://127.0.0.1:27017';
const sourceDbName = process.env.SOURCE_DB_NAME || 'ai_platform';
const targetUri = process.env.TARGET_MONGO_URI;
const targetDbName = process.env.TARGET_DB_NAME || 'ai_platform';

if (!targetUri) {
  console.error('Missing TARGET_MONGO_URI environment variable.');
  process.exit(1);
}

const batchSize = 500;

async function migrateCollection(sourceDb, targetDb, collectionName) {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);

  const total = await sourceCollection.countDocuments();
  if (total === 0) {
    console.log(`[${collectionName}] no documents to migrate.`);
    return;
  }

  console.log(`[${collectionName}] migrating ${total} documents...`);

  const cursor = sourceCollection.find({});
  let processed = 0;
  let ops = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    ops.push({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true
      }
    });

    if (ops.length >= batchSize) {
      await targetCollection.bulkWrite(ops, { ordered: false });
      processed += ops.length;
      ops = [];
      console.log(`[${collectionName}] ${processed}/${total} complete`);
    }
  }

  if (ops.length > 0) {
    await targetCollection.bulkWrite(ops, { ordered: false });
    processed += ops.length;
  }

  console.log(`[${collectionName}] ${processed}/${total} complete`);
}

async function run() {
  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDb = sourceClient.db(sourceDbName);
    const targetDb = targetClient.db(targetDbName);

    const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
    const names = collections.map((c) => c.name);

    if (names.length === 0) {
      console.log('No source collections found. Nothing to migrate.');
      return;
    }

    console.log(`Found collections: ${names.join(', ')}`);

    for (const name of names) {
      await migrateCollection(sourceDb, targetDb, name);
    }

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await sourceClient.close();
    await targetClient.close();
  }
}

run();
