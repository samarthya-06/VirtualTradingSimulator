import request from 'supertest';
import express from 'express';
import { setupDB, teardownDB, clearDB } from './setup.js';
import userRoutes from '../backend/routes/userRoutes.js';
import { errorHandler } from '../backend/middleware/errorMiddleware.js';
import User from '../backend/models/userModel.js';

// Create a test app
const app = express();
app.use(express.json());
app.use('/api/users', userRoutes);
app.use(errorHandler);

// Setup and teardown
beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

describe('Authentication API', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  describe('User Registration', () => {
    it('should register a new user and return a token', async () => {
      const res = await request(app)
        .post('/api/users')
        .send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('name', testUser.name);
      expect(res.body.user).toHaveProperty('email', testUser.email);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should not register a user with invalid data', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({
          name: 'T',
          email: 'invalid-email',
          password: 'pass'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('should not register a user with an existing email', async () => {
      // First create a user
      await User.create(testUser);

      // Try to create another user with the same email
      const res = await request(app)
        .post('/api/users')
        .send(testUser);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await User.create(testUser);
    });

    it('should login a user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toHaveProperty('name', testUser.name);
      expect(res.body.user).toHaveProperty('email', testUser.email);
    });

    it('should not login a user with invalid email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: 'wrong@example.com',
          password: testUser.password
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should not login a user with invalid password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
}); 