/* global process */
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

export function createAuthRoutes({ db }) {
    const router = express.Router();
    const jwtSecret = process.env.JWT_SECRET || 'development-only-secret';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ai-platform.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMeNow123!';
    const adminName = process.env.ADMIN_NAME || 'Platform Admin';

    const seedAdminPromise = seedAdminAccount();

    function createAuthToken(user) {
        return jwt.sign(
            {
                sub: user._id.toString(),
                role: user.role || 'user',
                email: user.email,
                name: user.name
            },
            jwtSecret,
            { expiresIn: '7d' }
        );
    }

    function sanitizeUser(user) {
        return {
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || 'user',
            aptitudeCompleted: Boolean(user.aptitudeCompleted),
            tokenBalance: Number(user.tokenBalance || 0),
            totalTokensEarned: Number(user.totalTokensEarned || 0)
        };
    }

    async function seedAdminAccount() {
        const existingAdmin = await db.collection('users').findOne({ email: adminEmail });

        if (existingAdmin) {
            const updates = {};

            if ((existingAdmin.role || 'user') !== 'admin') {
                updates.role = 'admin';
            }

            if (!existingAdmin.passwordHash) {
                updates.passwordHash = await bcrypt.hash(adminPassword, 10);
            }

            if (Object.keys(updates).length > 0) {
                updates.updatedAt = new Date();
                await db.collection('users').updateOne({ _id: existingAdmin._id }, { $set: updates, $unset: { password: '' } });
            }

            return;
        }

        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await db.collection('users').insertOne({
            email: adminEmail,
            name: adminName,
            role: 'admin',
            passwordHash,
            createdAt: new Date(),
            aptitudeCompleted: false,
            tokenBalance: 0,
            totalTokensEarned: 0,
            createdBySystem: true
        });

        console.log(`Seeded admin account: ${adminEmail}`);
    }

    async function authenticateRequest(req, res, next) {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const payload = jwt.verify(token, jwtSecret);
            req.auth = payload;
            next();
        } catch {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    }

    function requireAdmin(req, res, next) {
        if (req.auth?.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        next();
    }

    router.post('/auth/register', authenticateRequest, requireAdmin, async (req, res) => {
        await seedAdminPromise;
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        try {
            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'User already exists' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = {
                email,
                passwordHash,
                name,
                role: 'user',
                createdAt: new Date(),
                aptitudeCompleted: false,
                tokenBalance: 0,
                totalTokensEarned: 0
            };

            const result = await db.collection('users').insertOne(user);
            const insertedUser = await db.collection('users').findOne({ _id: result.insertedId });

            res.json({
                success: true,
                userId: result.insertedId.toString(),
                user: sanitizeUser(insertedUser)
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    });

    router.post('/auth/login', async (req, res) => {
        await seedAdminPromise;
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        try {
            const user = await db.collection('users').findOne({ email });

            if (!user) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            let passwordMatches = false;

            if (user.passwordHash) {
                passwordMatches = await bcrypt.compare(password, user.passwordHash);
            } else if (user.password) {
                // Legacy migration path: convert plain-text password to hash after first successful login.
                passwordMatches = user.password === password;

                if (passwordMatches) {
                    const passwordHash = await bcrypt.hash(password, 10);
                    await db.collection('users').updateOne(
                        { _id: user._id },
                        {
                            $set: { passwordHash, updatedAt: new Date() },
                            $unset: { password: '' }
                        }
                    );
                    user.passwordHash = passwordHash;
                    delete user.password;
                }
            }

            if (!passwordMatches) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }

            const token = createAuthToken(user);

            res.json({
                success: true,
                userId: user._id.toString(),
                token,
                user: sanitizeUser(user)
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    });

    // Public signup endpoint - anyone can create a regular user account
    router.post('/auth/signup', async (req, res) => {
        await seedAdminPromise;
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        try {
            const existingUser = await db.collection('users').findOne({ email });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const user = {
                email,
                passwordHash,
                name,
                role: 'user',
                createdAt: new Date(),
                aptitudeCompleted: false,
                tokenBalance: 0,
                totalTokensEarned: 0
            };

            const result = await db.collection('users').insertOne(user);
            const insertedUser = await db.collection('users').findOne({ _id: result.insertedId });

            // Log in the newly created user
            const token = createAuthToken(insertedUser);

            res.json({
                success: true,
                userId: result.insertedId.toString(),
                token,
                user: sanitizeUser(insertedUser)
            });
        } catch (error) {
            console.error('Signup error:', error);
            res.status(500).json({ error: 'Signup failed' });
        }
    });

    router.get('/auth/me', authenticateRequest, async (req, res) => {
        try {
            const user = await db.collection('users').findOne({ _id: new ObjectId(req.auth.sub) });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const latestResult = await db.collection('aptitude_results').findOne(
                { userId: user._id.toString() },
                { sort: { createdAt: -1 } }
            );

            res.json({
                success: true,
                user: sanitizeUser(user),
                latestResult: latestResult || null
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    });

    router.get('/auth/admin/status', authenticateRequest, requireAdmin, async (_req, res) => {
        res.json({ success: true, isAdmin: true });
    });

    return router;
}
