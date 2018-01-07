//
// TEST API 2
//

function biteABigSandwich(req, res, next)
{
    res.send('Called biteABigSandwich version 2.0.0');
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
