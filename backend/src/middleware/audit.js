const AuditLog = require('../../models/AuditLog');
function audit(action, entity) {
  return (req, res, next) => {
    res.on('finish', () => {
          if (res.statusCode < 400) {
      // Routes do not all name their param `id` (`/inventory/:sku`, `/refunds/:orderId`,
      // `/coupons/:code`), so fall back through the common spellings — an audit row without an
      // entity id is close to useless when someone is reconstructing what happened.
      const params = req.params || {};
      const entityId = params.id || params.orderId || params.sku || params.eventId || params.code || undefined;
      AuditLog.create({ actorId: req.user?._id, actorEmail: req.user?.email, action, entity, entityId, ip: req.ip, userAgent: req.get('user-agent'), requestId: req.id }).catch(() => {});
    }
    });
    next();
  };
}
module.exports = { audit };
