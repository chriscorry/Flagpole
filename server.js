const restify  = require('restify');
const flagpole = require('./Flagpole');

const testAPI  = require('./TestAPI');
const testAPI2 = require('./TestAPI2');


/****************************************************************************
 **                                                                        **
 ** SETUP                                                                  **
 **                                                                        **
 ****************************************************************************/

// TODO: pass in certs and key for HTTPS
var server = restify.createServer({name: 'Flagpole Test'});
server.use(restify.plugins.bodyParser());
flagpole.initialize(server);

const port = process.env.PORT || 3000;


/****************************************************************************
 **                                                                        **
 ** REGISTER APIs                                                          **
 **                                                                        **
 ****************************************************************************/

flagpole.registerAPI('test', undefined, undefined, '1.0.0', testAPI);
flagpole.registerAPI('test2', undefined, undefined, '2.0.0', testAPI2);
flagpole.registerAPI('test2', undefined, undefined, '3.0.0', './TestAPI3.js');

flagpole.unregisterAPI();


// Start processing requests
server.listen(port, () => {
  console.log('%s listening on port %s...', server.name, port);
});
