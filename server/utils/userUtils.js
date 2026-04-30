/* https://stackoverflow.com/questions/53686554/validate-mongodb-objectid
 *
 * Covers validating MongoDB objectIDs
 */
import { ObjectId } from 'mongodb';

// Attempts to safely convert a userId into an ObjectId
// Returns null if the value is missing, anonymous, or invalid
export function parseOptionalUserId(userId) {
    if (!userId || userId === 'anonymous') {
        return null;
    }

    if (!ObjectId.isValid(userId)) {
        return null;
    }

    return new ObjectId(userId);
}

// Simple helper to check if a value is a valid MongoDB ObjectId
export function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

// Converts a valid string ID into an ObjectId instance
// Assumes validation has already been done beforehand
export function toObjectId(id) {
    return new ObjectId(id);
}