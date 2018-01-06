//
// TEST API
//

const flagpole = require('./Flagpole');

function biteABigSandwich(req, res, next)
{
    res.send('Called biteABigSandwich');
    return next();
}

function getAPIs(req, res, next)
{
    res.send(flagpole.queryAPIs());
    return next();
}

var flagpoleHandlers = [
  {
    requestType: 'get',
    path: '/sandwich',
    handler: biteABigSandwich
  },
  {
    requestType: 'get',
    path: '/apis',
    handler: getAPIs
  }
];

module.exports = { flagpoleHandlers };
