import { MongoClient } from 'mongodb';

const MONGO_URI = 'mongodb://localhost:27017';

let db;
let client;

export async function connectToDB() {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('ai_platform');
    console.log('Connected to database');
    return db;
}

export function getDb() {
    if (!db) {
        throw new Error('Database connection has not been initialized.');
    }

    return db;
}

export async function closeDBConnection() {
    if (client) {
        await client.close();
    }
}
