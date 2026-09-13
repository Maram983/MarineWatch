const { supabaseAdmin } = require('../config/supabaseClient');
const { normalizeRole } = require('../utils/roles');

function normalizeProfile(row) {
  if (!row) return null;
  return { ...row, role: normalizeRole(row.role) };
}

// Fast, indexed lookup directly on the profiles table.
async function findByEmail(email) {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (error || !profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    ...normalizeProfile(profile)
  };
}

// Creates the auth user (Supabase handles password hashing) + profile row.
async function createUser({ full_name, email, password, role, phone, city, certification_number, emergency_contact }) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, phone, city, certification_number, emergency_contact }
  });

  if (error) {
    throw new Error(error.message || 'Failed to create user');
  }

  const userId = data.user.id;

  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    full_name,
    email,
    role,
    phone: phone || null,
    city: city || null,
    certification_number: certification_number || null,
    emergency_contact: emergency_contact || null,
    account_status: 'active'
  });

  if (profileError) {
    console.error('userModel.createUser profile upsert error:', JSON.stringify(profileError));
  }

  return userId;
}

async function findById(id) {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
  if (error || !data) return null;
  return normalizeProfile(data);
}

async function updateProfile(id, data) {
  const { full_name, phone, city, certification_number, emergency_contact } = data;
  await supabaseAdmin
    .from('profiles')
    .update({ full_name, phone: phone || null, city: city || null, certification_number: certification_number || null, emergency_contact: emergency_contact || null })
    .eq('id', id);
  return findById(id);
}

async function updatePasswordWithVerification(id, email, currentPassword, newPassword) {
  const { supabaseAnon } = require('../config/supabaseClient');
  const { error: signInError } = await supabaseAnon.auth.signInWithPassword({ email, password: currentPassword });
  if (signInError) {
    throw new Error('Current password is incorrect');
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password: newPassword });
  if (error) {
    throw new Error(error.message || 'Failed to update password');
  }
}

async function getUserCount() {
  const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true });
  return count || 0;
}

async function getRoleCount(role) {
  const { count } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', role);
  return count || 0;
}

async function getAllUsers() {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('userModel.getAllUsers error:', error);
    return [];
  }
  return data.map(normalizeProfile);
}

async function getDashboardStats() {
  const [totalUsers, totalDiver, totalVolunteer] = await Promise.all([
    getUserCount(),
    getRoleCount('diver'),
    getRoleCount('volunteer')
  ]);
  return { totalUsers, totalDiver, totalVolunteer };
}

async function updateUserStatus(id, account_status) {
  await supabaseAdmin.from('profiles').update({ account_status }).eq('id', id);
  return findById(id);
}

module.exports = {
  findByEmail,
  createUser,
  findById,
  updateProfile,
  updatePasswordWithVerification,
  getUserCount,
  getRoleCount,
  getAllUsers,
  getDashboardStats,
  updateUserStatus
};