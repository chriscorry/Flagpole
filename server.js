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
flagpole.initialize(server, {apiDir: process.env.FLAGPOLE_API_DIR});

const port = process.env.PORT || 3000;


/****************************************************************************
 **                                                                        **
 ** REGISTER APIs                                                          **
 **                                                                        **
 ****************************************************************************/

var err = flagpole.loadAPIConfig('./apiconfig.json')
if (err) console.log(err);


// Start processing requests
server.listen(port, () => {
  console.log('%s listening on port %s...', server.name, port);
});
