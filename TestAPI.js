//
// TEST API
//

function biteABigSandwich(req, res, next)
{
    res.send('Called biteABigSandwich');
    return next();
}

var flagpoleHandlers = [
  {
    requestType: 'get',
    path: '/sandwich',
    handler: biteABigSandwich
  }
];

module.exports = { flagpoleHandlers };
