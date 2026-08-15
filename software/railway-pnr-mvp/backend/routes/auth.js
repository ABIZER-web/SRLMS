const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Staff login (admin / coach_attendant) - by empId + password
router.post('/login/staff', async (req, res) => {
  const { empId, password } = req.body;
  if (!empId || !password) return res.status(400).json({ message: 'empId and password are required' });

  const user = await User.findOne({ empId });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'Account is suspended' });

  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

// Passenger login - by mobile + password (demo only; real app would use OTP)
router.post('/login/passenger', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) return res.status(400).json({ message: 'mobile and password are required' });

  const user = await User.findOne({ mobile, role: 'passenger' });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toSafeJSON() });
});

module.exports = router;
