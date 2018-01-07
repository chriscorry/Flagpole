const restify = require('restify');
const _       = require('lodash');
const fperr   = require('./FlagpoleErr');


var serverRestify;
var requestTypes          = new Map();
var registeredAPIsByToken = new Map();


/****************************************************************************
 **                                                                        **
 ** Utilities                                                              **
 **                                                                        **
 ****************************************************************************/

function filterMap(map, test)
{
  var newMap = new Map();
  map.forEach((value, key) => {
    if (test(key, value)) {
      newMap.set(key, value);
    }
  });
  return newMap;
}


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
  var apiToken = _.toLower(_.trim(name)) + ':' + _.trim(ver);

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
    // pathInfo { requestType, path, handler, route (which we set) }
    newAPI.apiHandler.flagpoleHandlers.forEach((pathInfo) => {

      // Validate requestType
      var httpRequestType = _.lowerCase(_.trim(pathInfo.requestType));
      if (httpRequestType.match('get|post|put|patch|del|opts')) {

        // Register the route
        var funcRequestHandler = requestTypes.get(httpRequestType);
        if (funcRequestHandler) {
          pathInfo.route = funcRequestHandler.call(serverRestify, {
                                                    path: pathInfo.path,
                                                    version: newAPI.ver
                                                  },
                                                  pathInfo.handler);
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

function initialize(server)
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
 ** PRIVATE unregisterAPIInfo(...)                                         **
 **                                                                        **
 ****************************************************************************/

function unregisterAPIInfo(apiUnregInfo)
{
  // Iterate over each route and remove
  apiUnregInfo.apiHandler.flagpoleHandlers.forEach((pathInfo) => {

    // Unregister the route
    serverRestify.rm(pathInfo.route);
    pathInfo.route = undefined;
  });
}


/****************************************************************************
 **                                                                        **
 ** PRIVATE unregisterAllAPIs(...)                                         **
 **                                                                        **
 ****************************************************************************/

function unregisterAllAPIs()
{
  registeredAPIsByToken.forEach((apiInfo, apiToken) => {
    unregisterAPIInfo(apiInfo);
  });
  registeredAPIsByToken.clear();
  return true;
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC unregisterAPI(...)                                              **
 **                                                                        **
 ****************************************************************************/

function unregisterAPI(nameOrToken, ver)
{
  var found = false;

  // No args means wipe them all out
  if (!nameOrToken && !ver) {
    return unregisterAllAPIs();
  }

  // Move through the map and process each item
  registeredAPIsByToken = filterMap(registeredAPIsByToken, (apiToken, apiInfo) => {

    // If a version was specified, nameOrToken is a name and only the
    // specified version should be removed
    if ((ver && apiInfo.name === nameOrToken && apiInfo.ver === ver) ||

        // If a version was NOT specified and the tokens match, that's our target
        (!ver && apiInfo.apiToken === nameOrToken) ||

        // If a version was NOT specified and the names match, we want to
        // remove ALL versions of this API
        (!ver && apiInfo.name === nameOrToken)) {

      // Out with the routes and keep out of map
      unregisterAPIInfo(apiInfo);
      found = true;
      return false;
    }

    // Keep in the map
    return true;
  });

  return found;
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC loadAPIConfig(...)                                              **
 **                                                                        **
 ****************************************************************************/

function loadAPIConfig(configFile)
{
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


module.exports = { initialize,
                   registerAPI,
                   unregisterAPI,
                   queryAPIs };
