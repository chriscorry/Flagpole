//
// Management API
//

const flagpole = require('../Flagpole');

function reloadAPIConfig(req, res, next)
{
  if (req.body && req.body.fileName) {
    flagpole.loadAPIConfig(req.body.fileName);
    res.send(200, { result: 'API config file has been reloaded.'});
  }
  else {
    res.send(400, { reason: 'Config filename not specified.'});
  }
  return next();
}

function unregisterAPI(req, res, next)
{
    return next();
}

function getAPIs(req, res, next)
{
    res.send(flagpole.queryAPIs());
    return next();
}

var flagpoleHandlers = [
  {
    requestType: 'patch',
    path: '/reloadconfig',
    handler: reloadAPIConfig
  },
  {
    requestType: 'get',
    path: '/apis',
    handler: getAPIs
  }
];

module.exports = { flagpoleHandlers };
