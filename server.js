const restify  = require('restify');
const flagpole = require('./Flagpole');


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

var err;
flagpole.registerAPI('dog',        undefined, undefined, '1.0.0', './api/dog_1.0.0.js');
flagpole.registerAPI('management', undefined, undefined, '1.0.0', './api/management_1.0.0.js');
flagpole.registerAPI('test',       undefined, undefined, '1.0.0', './api/testapi_1.0.0.js');
flagpole.registerAPI('test',       undefined, undefined, '2.0.0', './api/testapi_2.0.0.js');


// Start processing requests
server.listen(port, () => {
  console.log('%s listening on port %s...', server.name, port);
});
