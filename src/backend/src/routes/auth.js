const { Router } = require('express');
const { AuthController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.post('/login', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Login with email and password'
    // #swagger.description = 'Authenticates an admin or partner user and returns a JWT token. Partner users can sign in using the temporary password sent during registration.'
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
  /* #swagger.responses[403] = { description: 'Partner account is locked' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return AuthController.login(req, res);
});

router.post('/forgot-password', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Request password reset OTP'
  // #swagger.description = 'Sends a one-time password (OTP) to the user email if it exists. Always returns success to prevent email enumeration.'
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

router.post('/forgot-password/complete', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Complete password reset using OTP'
  // #swagger.description = 'Sets a new password using email + OTP.'
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['email', 'otp', 'password'],
             properties: {
               email: { type: 'string', example: 'user@svp.org' },
               otp: { type: 'string', example: '123456' },
               password: { type: 'string', example: 'NewStrongPass123' }
             }
           }
         }
       }
     } */
  return AuthController.completeForgotPassword(req, res);
});

router.post('/partner-registration/request', (req, res) => {
  // #swagger.tags = ['Auth']
  // #swagger.summary = 'Request partner account registration'
  // #swagger.description = 'For first-time partner registration, creates the partner user login and sends a temporary password via email for immediate sign-in.'
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
  return AuthController.requestPartnerRegistration(req, res);
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
