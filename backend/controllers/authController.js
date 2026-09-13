const userModel = require('../models/userModel');
const { normalizeRole } = require('../utils/roles');
const { supabaseAnon } = require('../config/supabaseClient');

const emailPattern = /^\S+@\S+\.\S+$/;
const allowedRoles = ['diver', 'volunteer'];

async function register(req, res) {
  try {
    const { full_name, username, email, password, confirmPassword, phone, city, certification_number, role } = req.body;
    const trimmedEmail = email ? String(email).trim().toLowerCase() : '';
    const selectedRole = String(role || '').toLowerCase();
    const providedName = String(full_name || username || '').trim();

    if (!providedName || !trimmedEmail || !password) {
      return res.status(400).json({ message: 'Please fill in the required fields' });
    }
    if (!emailPattern.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (confirmPassword !== undefined && String(confirmPassword) !== String(password)) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (selectedRole === 'admin') {
      return res.status(403).json({ message: 'Admin registration is not allowed' });
    }
    if (!allowedRoles.includes(selectedRole)) {
      return res.status(400).json({ message: 'Please select a valid role' });
    }
    if (selectedRole === 'diver' && (!certification_number || String(certification_number).trim().length < 4)) {
      return res.status(400).json({ message: 'Certification number is required for divers' });
    }

    const existingUser = await userModel.findByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const userId = await userModel.createUser({
      full_name: providedName,
      email: trimmedEmail,
      password,
      role: selectedRole,
      phone: phone || null,
      city: city || null,
      certification_number: selectedRole === 'diver' ? String(certification_number).trim() : null
    });

    const user = await userModel.findById(userId);
    res.status(201).json({ message: 'User registered successfully', user });
  } catch (error) {
    console.error('Auth.register error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
}

async function registerVolunteer(req, res) {
  try {
    const { full_name, email, password, phone, city } = req.body;
    const trimmedEmail = email ? String(email).trim().toLowerCase() : '';

    if (!full_name || !trimmedEmail || !password) {
      return res.status(400).json({ message: 'Please fill in the required fields' });
    }
    if (!emailPattern.test(trimmedEmail)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const existingUser = await userModel.findByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const userId = await userModel.createUser({
      full_name: String(full_name).trim(),
      email: trimmedEmail,
      password,
      role: 'volunteer',
      phone: phone || null,
      city: city || null,
      certification_number: null
    });

    const user = await userModel.findById(userId);
    res.status(201).json({ message: 'Volunteer registered successfully', user });
  } catch (error) {
    console.error('Auth.registerVolunteer error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const trimmedEmail = email ? String(email).trim().toLowerCase() : '';

    if (!trimmedEmail || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Supabase verifies the password and issues a real JWT session token.
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email: trimmedEmail, password });
    if (error || !data?.session) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Self-healing: rebuild the profile on the fly if it's missing instead
    // of blocking the login (covers older accounts / one-off write failures).
    let profile = await userModel.findById(data.user.id);
    if (!profile) {
      profile = await userModel.ensureProfile(data.user);
    }
    if (!profile) {
      return res.status(500).json({ message: 'Could not load or create your profile. Please try again.' });
    }

    const accountStatus = profile.account_status || 'active';
    if (accountStatus !== 'active') {
      return res.status(403).json({ message: 'Your account is not active' });
    }

    const normalizedRole = normalizeRole(profile.role);
    const safeUser = {
      id: data.user.id,
      full_name: profile.full_name,
      email: data.user.email,
      role: normalizedRole,
      phone: profile.phone,
      city: profile.city,
      certification_number: profile.certification_number,
      account_status: accountStatus,
      created_at: profile.created_at
    };

    // This is the Supabase-issued access token — the frontend keeps using it
    // exactly like the old custom JWT (same "Authorization: Bearer <token>" pattern).
    res.json({ message: 'Login successful', token: data.session.access_token, user: safeUser });
  } catch (error) {
    console.error('LOGIN_ERROR:', error);
    res.status(500).json({ message: 'Login failed' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error('Auth.getProfile error:', error);
    res.status(500).json({ message: 'Could not load profile' });
  }
}

module.exports = {
  register,
  registerVolunteer,
  login,
  getProfile
};