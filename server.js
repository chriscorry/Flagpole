const restify  = require('restify');
const flagpole = require('./flagpole');

const testAPI  = require('./TestAPI');
const testAPI2 = require('./TestAPI2');


const port = process.env.PORT || 3000;


// TODO: pass in certs and key for HTTPS
var server = restify.createServer();
flagpole.init(server);
flagpole.registerAPI('test', undefined, undefined, '1.0.0', testAPI);
flagpole.registerAPI('test', undefined, undefined, '2.0.0', testAPI2);

server.listen(port, function() {
  console.log('%s listening at %s', server.name, server.url);
});
