const restify  = require('restify');
const flagpole = require('./Flagpole');

const testAPI  = require('./TestAPI');
const testAPI2 = require('./TestAPI2');


const port = process.env.PORT || 3000;


// TODO: pass in certs and key for HTTPS
var server = restify.createServer({name: 'Flagpole'});
flagpole.init(server);

// Regsiter our APIs
flagpole.registerAPI('test', undefined, undefined, '1.0.0', testAPI);
flagpole.registerAPI('test', undefined, undefined, '2.0.0', testAPI2);
flagpole.registerAPI('test', undefined, undefined, '3.0.0', './TestAPgI3.js');

// STart processing requests
server.listen(port, () => {
  console.log('%s listening on port %s...', server.name, port);
});
