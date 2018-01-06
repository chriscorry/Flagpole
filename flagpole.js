const restify = require('restify');
const _       = require('lodash');
const fperr   = require('./FlagpoleErr');


var serverRestify;
var requestTypes          = new Map();
var registeredAPIsByToken = new Map();


/****************************************************************************
 **                                                                        **
 ** PRIVATE registerAPIDirect(...)                                         **
 **                                                                        **
 ****************************************************************************/

function registerAPIDirect(name,
                           descriptiveName,
                           description,
                           ver,
                           apiHandler)
{
  // Simple validation
  if (!serverRestify || !name || !ver || !apiHandler) {
    return new fperr.FlagpoleErr('ERR_BAD_ARG');
  }

  // Validate version format
  if (!ver.match(/(\d+\.)?(\d+\.)?(\d+)/)) {
    return new fperr.FlagpoleErr('ERR_BAD_ARG', 'Invalid version format');
  }

  // Create our new API token
  var apiToken = _.lowerCase(_.trim(name)) + ':' + ver.toString();

  // Has this API already been registered?
  if (registeredAPIsByToken.get(apiToken)) {
    return new fperr.FlagpoleErr('ERR_API_ALREADY_REG', 'Attempted to register same API more than once');
  }

  var newAPI = {
    name,
    descriptiveName,
    description,
    ver,
    apiHandler,
    apiToken
  };

  try {
    // Register the routes
    // newApi.apiHandler.flagpoleHandlers is an array of pathInfos
    // pathInfo { requestType, path, handler }
    newAPI.apiHandler.flagpoleHandlers.forEach((pathInfo) => {

      // Validate requestType
      var httpRequestType = _.lowerCase(_.trim(pathInfo.requestType));
      if (httpRequestType.match('get|post|put|patch|del|opts')) {

        // Register the route
        var funcRequestHandler = requestTypes.get(httpRequestType);
        if (funcRequestHandler) {
          funcRequestHandler.call(serverRestify,
                                  {path: pathInfo.path, version: newAPI.ver},
                                  pathInfo.handler)
        }
      }
      else {
        throw new fperr.FlagpoleErr('ERR_REGISTER_ROUTE',
                                    `Bad request type: "${pathInfo.requestType}"`);
      }
    });
  }
  catch (error) {
    if (error instanceof fperr.FlagpoleErr) {
      return error;
    }
    return new fperr.FlagpoleErr('ERR_REGISTER_ROUTE',
                                 `Could not register route: "${pathInfo.requestType}", "${pathInfo.path}", ${newAPI.ver}`,
                                 error);
  }

  // Add to the main API collection
  registeredAPIsByToken.set(apiToken, newAPI);

  // Let the API know
  if (newAPI.apiHandler.init) {
    newApi.apiHandler.init(serverRectify, apiToken);
  }
}


/****************************************************************************
 **                                                                        **
 ** PRIVATE registerAPIFromFile(...)                                       **
 **                                                                        **
 ****************************************************************************/

function registerAPIFromFile(name,
                             descriptiveName,
                             description,
                             ver,
                             fileName)
{
  var newAPI;
  try {
    newAPI = require(fileName);
  } catch(error) {
    return new fperr.FlagpoleErr('ERR_FILE_LOAD', 'Could not load API file', error);
  }
  return registerAPIDirect(name,
                           descriptiveName,
                           description,
                           ver,
                           newAPI);
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC init(server: Required, Restify server instance)                 **
 **                                                                        **
 ****************************************************************************/

function init(server)
{
  serverRestify = server;
  requestTypes.set('get',   serverRestify.get);
  requestTypes.set('post',  serverRestify.post);
  requestTypes.set('put',   serverRestify.put);
  requestTypes.set('patch', serverRestify.patch);
  requestTypes.set('del',   serverRestify.del);
  requestTypes.set('opts',  serverRestify.opts);
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC registerAPI(...)                                                **
 **                                                                        **
 ****************************************************************************/

function registerAPI(name,
                     descriptiveName,
                     description,
                     ver,
                     pathOrHandler)
{
  if (typeof pathOrHandler === "object") {
    return registerAPIDirect(name,
                             descriptiveName,
                             description,
                             ver,
                             pathOrHandler);
  }
  else {
    return registerAPIFromFile(name,
                               descriptiveName,
                               description,
                               ver,
                               pathOrHandler);
  }
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC queryAPIs(...)                                                  **
 **                                                                        **
 ****************************************************************************/

function queryAPIs()
{
  var apis = [];

  registeredAPIsByToken.forEach((newAPI) => {
    apis.push({
        name: newAPI.name,
        descriptiveName: newAPI.descriptiveName,
        description: newAPI.description,
        ver: newAPI.ver,
        apiToken: newAPI.apiToken
      });
  });

  return apis;
}


module.exports = { init, registerAPI, queryAPIs };
