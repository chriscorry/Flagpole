class FlagpoleErr extends Error
{
  constructor(status, reason, errInfo) {
    super(reason);
    this.status = status;
    this.reason = reason;
    this.errorInfo = errInfo;
  }
}

module.exports = { FlagpoleErr };
