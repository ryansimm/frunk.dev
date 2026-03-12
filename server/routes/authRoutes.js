import express from 'express';

export function createAuthRoutes({ db }) {
    const router = express.Router();

    router.post('/auth/register', async (req, res) => {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        try {
            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const user = {
                email,
                password,
                name,
                createdAt: new Date(),
                aptitudeCompleted: false,
                tokenBalance: 0,
                totalTokensEarned: 0
            };

            const result = await db.collection('users').insertOne(user);

            res.json({
                success: true,
                userId: result.insertedId.toString(),
                user: { email, name, tokenBalance: 0 }
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    router.post('/auth/login', async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const user = await db.collection('users').findOne({ email, password });

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            res.json({
                success: true,
                userId: user._id.toString(),
                user: {
                    email: user.email,
                    name: user.name,
                    aptitudeCompleted: user.aptitudeCompleted || false,
                    tokenBalance: user.tokenBalance || 0
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    return router;
}
