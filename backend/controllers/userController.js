const userModel = require('../models/userModel');

async function getProfile(req, res) {
  try {
    const user = await userModel.findById(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load profile' });
  }
}

async function updateProfile(req, res) {
  try {
    const { full_name, phone, city, certification_number, emergency_contact } = req.body;
    const updatedUser = await userModel.updateProfile(req.user.id, {
      full_name, phone, city, certification_number, emergency_contact
    });
    res.json({ message: 'Profile updated', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not update profile' });
  }
}

async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters' });
    }

    await userModel.updatePasswordWithVerification(req.user.id, req.user.email, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    const message = error.message === 'Current password is incorrect' ? error.message : 'Could not update password';
    const status = error.message === 'Current password is incorrect' ? 400 : 500;
    res.status(status).json({ message });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  updatePassword
};
