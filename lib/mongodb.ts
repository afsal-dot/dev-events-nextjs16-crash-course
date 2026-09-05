import mongoose, {type Mongoose} from "mongoose";

interface MongooseCache {
    connection: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

// Store the cache on globalThis so Next.js hot reloads do not create new pools.
const globalWithMongoose = globalThis as typeof globalThis & {
    mongooseCache?: MongooseCache;
};

const cache = globalWithMongoose.mongooseCache ?? {
    connection: null,
    promise: null,
};

globalWithMongoose.mongooseCache = cache;

/**
 * Connects to MongoDB and reuses the same Mongoose connection for this process.
 */

export async function connectDB(): Promise<Mongoose> {
    if (cache.connection) {
        return cache.connection;
    }

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error(
            "MONGODB_URI is not defined. Add it to your server environment variables.",
        );
    }

    // Reuse an in-flight promise when concurrent requests connect for the first time.
    cache.promise ??= mongoose.connect(uri, {
        bufferCommands: false,
    });

    try {
        cache.connection = await cache.promise;
        return cache.connection;
    } catch (error: unknown) {
        // Permit a later request to retry after a failed connection attempt.
        cache.promise = null;
        throw error;
    }
}

export default connectDB;
