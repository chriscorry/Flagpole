//
// Management API
//

const flagpole = require('../Flagpole');
const _        = require('lodash');

var nameThisAPI, verThisAPI;


function initialize(serverRestify, name, ver, apiToken)
{
  nameThisAPI = name;
  verThisAPI = ver;
}


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
  var status, reason, name, ver;

  if (req.body) {
    name = _.toLower(_.trim(req.body.name));
    ver = req.body.ver;
    if (name === nameThisAPI && ver === verThisAPI) {
      status = 400;
      reason = `This management API ('${name}', v${ver}) cannot be unregistered.`;
    }
    else if (true === flagpole.unregisterAPI(name, ver)) {
      status = 200;
      reason = `API '${name}', v${ver} has been unregistered.`;
    }
  }
  if (!status) {
    status = 400;
    reason = `API '${name}', v${ver} could not be unregistered.`;
  }
  res.send(status, { reason });
  return next();
}


function getAPIs(req, res, next)
{
    res.send(200, flagpole.queryAPIs());
    return next();
}


var flagpoleHandlers = [
  {
    requestType: 'patch',
    path: '/flagpole/reloadconfig',
    handler: reloadAPIConfig
  },
  {
    requestType: 'get',
    path: '/flagpole/apis',
    handler: getAPIs
  },
  {
    requestType: 'del',
    path: '/flagpole/unregister',
    handler: unregisterAPI
  }
];

module.exports = { initialize, flagpoleHandlers };
