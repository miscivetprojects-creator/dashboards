const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getCollection } = require('../db/mongoClient');

const activeUserSessions = new Map();

const authService = {
  async hashUserPassword(plainPassword) {
    return await bcrypt.hash(plainPassword, 10);
  },

  async verifyUserPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  async login(emailAddress, inputPassword) {
    const usersCollection = getCollection('users');
    const userRecord = await usersCollection.findOne({ email: emailAddress.toLowerCase().trim() });
    if (!userRecord) {
      throw new Error('Invalid email or password.');
    }
    if (userRecord.isActive === false || userRecord.status === 'inactive') {
      throw new Error('Account has been deactivated. Please contact administrator.');
    }

    const isPasswordValid = await bcrypt.compare(inputPassword, userRecord.password_hash || userRecord.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password.');
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionDetails = {
      userId: userRecord._id.toString(),
      email: userRecord.email,
      fullName: userRecord.full_name || userRecord.fullName || userRecord.name,
      role: userRecord.role,
      department: userRecord.department_id || userRecord.department || 'All',
      location: userRecord.location_id || userRecord.location || 'All',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    activeUserSessions.set(sessionToken, sessionDetails);

    await usersCollection.updateOne(
      { _id: userRecord._id },
      { $set: { last_login: new Date(), lastLoginAt: new Date() } }
    );

    return {
      token: sessionToken,
      user: {
        id: userRecord._id,
        email: userRecord.email,
        fullName: sessionDetails.fullName,
        role: userRecord.role,
        department: sessionDetails.department,
        location: sessionDetails.location
      }
    };
  },

  async validateSession(token) {
    if (!token) return null;
    const session = activeUserSessions.get(token);
    if (!session) return null;

    if (new Date() > session.expiresAt) {
      activeUserSessions.delete(token);
      return null;
    }

    return session;
  },

  async logout(token) {
    if (token) {
      activeUserSessions.delete(token);
    }
    return true;
  },

  async changePassword(userId, currentPassword, newPassword) {
    const usersCollection = getCollection('users');
    let query;
    try {
      const { ObjectId } = require('mongodb');
      query = { _id: new ObjectId(userId) };
    } catch {
      query = { _id: userId };
    }

    let userRecord = await usersCollection.findOne(query);
    if (!userRecord) {
      userRecord = await usersCollection.findOne({ _id: userId });
    }
    if (!userRecord) throw new Error('User not found.');

    const isMatch = await bcrypt.compare(currentPassword, userRecord.password_hash || userRecord.passwordHash);
    if (!isMatch) throw new Error('Incorrect current password.');

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    const updatedHash = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { _id: userRecord._id },
      { $set: { password_hash: updatedHash, passwordHash: updatedHash, updatedAt: new Date() } }
    );
    return true;
  },

  async resetPasswordByAdmin(userId, temporaryPassword) {
    const usersCollection = getCollection('users');
    let query;
    try {
      const { ObjectId } = require('mongodb');
      query = { _id: new ObjectId(userId) };
    } catch {
      query = { _id: userId };
    }

    const updatedHash = await bcrypt.hash(temporaryPassword, 10);
    await usersCollection.updateOne(
      query,
      { $set: { password_hash: updatedHash, passwordHash: updatedHash, updatedAt: new Date() } }
    );
    return true;
  }
};

module.exports = { authService };
