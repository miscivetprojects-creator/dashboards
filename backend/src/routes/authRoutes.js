const express = require('express');
const { authService } = require('../services/authService');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const { token, user } = await authService.login(email, password);
    res.cookie('civet_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    return res.json({ token, user });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.civet_session || req.headers.authorization?.replace('Bearer ', '');
    await authService.logout(token);
    res.clearCookie('civet_session');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
router.get('/me', authMiddleware, async (req, res) => {
  return res.json({ user: req.user });
});
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user.userId, oldPassword, newPassword);
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});
module.exports = router;