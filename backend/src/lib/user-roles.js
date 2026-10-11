const STAFF_ROLES = ['support', 'warehouse', 'catalog_manager', 'finance', 'admin', 'super_admin'];

const customerAccountFilter = () => ({
  $and: [
    { roles: 'customer' },
    { roles: { $nin: STAFF_ROLES } },
  ],
});

const staffAccountFilter = () => ({ roles: { $in: STAFF_ROLES } });

module.exports = { STAFF_ROLES, customerAccountFilter, staffAccountFilter };
