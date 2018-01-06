//
// TEST API 3
//

function biteABigSandwich(req, res, next)
{
    res.send('Called biteABigSandwich version 3');
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
