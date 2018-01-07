//
// Management API
//

const flagpole = require('../Flagpole');

function getAPIs(req, res, next)
{
    res.send(flagpole.queryAPIs());
    return next();
}

var flagpoleHandlers = [
  {
    requestType: 'get',
    path: '/apis',
    handler: getAPIs
  }
];

module.exports = { flagpoleHandlers };
