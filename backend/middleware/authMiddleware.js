const { supabaseAdmin } = require('../config/supabaseClient');
const { normalizeRole } = require('../utils/roles');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ message: 'Profile not found for this user' });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
      role: normalizeRole(profile.role)
    };
    next();
  } catch (error) {
    console.error('authMiddleware error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;
