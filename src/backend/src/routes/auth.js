const { Router } = require('express');
const { AuthController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Login with email and password'
    // #swagger.description = 'Authenticates an admin or partner user and returns a JWT token. Partner accounts are linked to a partner profile and receive partner-scoped access.'
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['email', 'password'],
             properties: {
               email: { type: 'string', example: 'admin@svp.org' },
               password: { type: 'string', example: 'password123' },
               chapter_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = {
       description: 'Login successful',
       content: {
         "application/json": {
           schema: {
             type: 'object',
             properties: {
               success: { type: 'boolean', example: true },
               data: {
                 type: 'object',
                 properties: {
                   token: { type: 'string' },
                    user: { type: 'object', description: 'Authenticated user profile. Partner users include partner_id and partner_name.' }
                 }
               }
             }
           }
         }
       }
     } */
  /* #swagger.responses[400] = { description: 'Validation error — email and password required' } */
  /* #swagger.responses[401] = { description: 'Invalid email or password' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return AuthController.login(req, res);
});

router.post('/forgot-password', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Request password reset'
  // #swagger.description = 'Sends a new password to the user email if it exists. Always returns success to prevent email enumeration.'
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['email'],
             properties: {
               email: { type: 'string', example: 'user@svp.org' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = { description: 'Request processed (always returns same message)' } */
  /* #swagger.responses[400] = { description: 'Email is required' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return AuthController.forgotPassword(req, res);
});

router.post('/partner-activation/request', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Request partner account activation'
  // #swagger.description = 'Sends an activation link to an existing partner user email.'
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['email', 'chapter_id'],
             properties: {
               email: { type: 'string', example: 'partner@svp.org' },
               chapter_id: { type: 'string', format: 'uuid' }
             }
           }
         }
       }
     } */
  return AuthController.requestPartnerActivation(req, res);
});

router.post('/partner-activation/complete', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Complete partner account activation'
  // #swagger.description = 'Activates partner account and sets the login password using activation token.'
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['token', 'password'],
             properties: {
               token: { type: 'string' },
               password: { type: 'string', example: 'StrongPassword123!' }
             }
           }
         }
       }
     } */
  return AuthController.completePartnerActivation(req, res);
});

router.post('/logout', authenticate, (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Logout current user'
  // #swagger.description = 'Client-side token discard (stateless JWT). Requires authentication.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.responses[200] = { description: 'Logged out successfully' } */
  return AuthController.logout(req, res);
});

router.get('/me', authenticate, (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Get current user profile'
  // #swagger.description = 'Returns the authenticated user profile (without password_hash).'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.responses[200] = { description: 'Current user data' } */
  /* #swagger.responses[401] = { description: 'Not authenticated' } */
  /* #swagger.responses[404] = { description: 'User not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return AuthController.me(req, res);
});

module.exports = router;
