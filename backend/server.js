const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const { supabaseAdmin } = require('./config/supabaseClient');

const app = express();
const PORT = Number(process.env.PORT || 55001);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
// Note: /uploads is gone — report images now live in Supabase Storage
// (public bucket "report-images"), so files are served directly from
// your Supabase project, not from this server.

app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('id', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return res.status(500).json({ success: false, error: 'Unable to fetch user profiles.' });
  }
});

app.get('/api/users/role/:role', async (req, res) => {
  const { role } = req.params;
  const validRoles = ['admin', 'diver', 'volunteer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role parameter.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('role', role)
      .order('id', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (error) {
    console.error(`GET /api/users/role/${role} error:`, error);
    return res.status(500).json({ success: false, error: 'Unable to fetch users by role.' });
  }
});

app.get('/api/all-data', async (req, res) => {
  try {
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('id', { ascending: true });
    if (error) throw error;

    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        users,
        system: {
          appName: 'Marine Watch Backend',
          serverTime: new Date().toISOString(),
          nodeVersion: process.version,
          platform: process.platform,
          totalUsers: users.length,
          roleCounts
        }
      }
    });
  } catch (error) {
    console.error('GET /api/all-data error:', error);
    return res.status(500).json({ success: false, error: 'Unable to fetch overview data.' });
  }
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');
const activityRoutes = require('./routes/activityRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/admin', adminRoutes);

function startServer(port, maxAttempts = 10) {
  const numericPort = Number(port);
  const server = app.listen(numericPort, () => {
    console.log(`Server running on http://localhost:${numericPort}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && maxAttempts > 0) {
      console.warn(`Port ${numericPort} is in use. Trying port ${numericPort + 1}...`);
      server.close(() => startServer(numericPort + 1, maxAttempts - 1));
      return;
    }
    console.error('Server failed to start:', error);
    process.exit(1);
  });
}

startServer(PORT);
