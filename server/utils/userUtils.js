import { ObjectId } from 'mongodb';

export function parseOptionalUserId(userId) {
    if (!userId || userId === 'anonymous') {
        return null;
    }

    if (!ObjectId.isValid(userId)) {
        return null;
    }

    return new ObjectId(userId);
}

export function isValidObjectId(id) {
    return ObjectId.isValid(id);
}

export function toObjectId(id) {
    return new ObjectId(id);
}
