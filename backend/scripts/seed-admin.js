#!/usr/bin/env node
require('dotenv').config();

// Local-dev only: some ISP resolvers refuse Atlas SRV lookups. Keep seed scripts consistent
// with server.js when DNS_SERVERS is explicitly configured; never set this in production.
if (process.env.DNS_SERVERS) {
  const dns = require('dns');
  const servers = process.env.DNS_SERVERS.split(',').map((server) => server.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD are required');
  if (ADMIN_PASSWORD.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10_000 });
  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    existing.roles = Array.from(new Set([...existing.roles, 'admin', 'super_admin']));
    existing.passwordHash = await User.hashPassword(ADMIN_PASSWORD);
    await existing.save();
    console.log(`Updated existing admin ${existing.email}`);
  } else {
    await User.create({ email: ADMIN_EMAIL, firstName: 'Store', lastName: 'Admin', roles: ['admin', 'super_admin'], passwordHash: await User.hashPassword(ADMIN_PASSWORD) });
    console.log(`Created admin ${ADMIN_EMAIL}`);
  }
  await mongoose.connection.close();
}
main().catch((error) => { console.error(error.message); process.exit(1); });
