import express from 'express';

export function createSystemRoutes({ db }) {
    const router = express.Router();

    router.get('/test', async (req, res) => {
        try {
            const result = await db.collection('test').insertOne({
                message: 'Backend is working!',
                timestamp: new Date()
            });

            res.json({
                success: true,
                message: 'Database connected!',
                id: result.insertedId
            });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
