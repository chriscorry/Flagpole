//
// Dog API
//

function woof(req, res, next)
{
    res.send('Called woof! version 1.0.0');
    return next();
}

var flagpoleHandlers = [
  {
    requestType: 'get',
    path: '/woof',
    handler: woof
  }
];

module.exports = { flagpoleHandlers };
