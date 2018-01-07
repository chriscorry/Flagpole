//
// TEST API
//

function biteABigSandwich(req, res, next)
{
    res.send('Called biteABigSandwich version 1.0.0');
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
