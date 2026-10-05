const AuditLog = require('../../models/AuditLog');
function audit(action, entity) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) AuditLog.create({ actorId: req.user?._id, actorEmail: req.user?.email, action, entity, entityId: req.params.id, ip: req.ip, userAgent: req.get('user-agent'), requestId: req.id }).catch(() => {});
    });
    next();
  };
}
module.exports = { audit };
