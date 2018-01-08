const restify = require('restify');
const path    = require('path');
const _       = require('lodash');
const fperr   = require('./FlagpoleErr');


var serverRestify;
var apiDir                = './';
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


function buildSafePath(fileName)
{
  var safeSuffix = path.normalize(fileName).replace(/^(\.\.[\/\\])+/, '');
  var safeName = path.join(apiDir, safeSuffix);
  if (!path.isAbsolute(safeName)) {
    safeName = './' + safeName;
  }
  return safeName;
}


/****************************************************************************
 **                                                                        **
 ** PRIVATE registerAPIDirect(...)                                         **
 **                                                                        **
 ****************************************************************************/

function registerAPIDirect(name,
                           descriptiveName, // opt
                           description, // opt
                           ver,
                           apiHandler,
                           fileName) // opt
{
  // Simple validation
  if (!serverRestify) {
    return new fperr.FlagpoleErr('ERR_FLAGPOLE_NOT_INIT');
  }
  if (!name || !ver || !apiHandler) {
    return new fperr.FlagpoleErr('ERR_BAD_ARG');
  }

  // Validate version format
  if (!ver.match(/(\d+\.)?(\d+\.)?(\d+)/)) {
    return new fperr.FlagpoleErr('ERR_BAD_ARG', 'Invalid version format');
  }

  // Create our new API token
  name = _.toLower(_.trim(name));
  var apiToken = name + ':' + _.trim(ver);

  // Has this API already been registered?
  if (registeredAPIsByToken.get(apiToken)) {

    // Unregister what's currently there
    unregisterAPI(apiToken);
  }

  var newAPI = {
    name,
    descriptiveName,
    description,
    ver,
    apiHandler,
    apiToken,
    fileName
  };

  try {
    // Register the routes
    // newApi.apiHandler.flagpoleHandlers is an array of pathInfos
    // pathInfo { requestType, path, handler, route (which we set) }
    newAPI.apiHandler.flagpoleHandlers.forEach((pathInfo) => {

      // Validate requestType
      var httpRequestType = _.toLower(_.trim(pathInfo.requestType));
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
  if (newAPI.apiHandler.initialize) {
    newAPI.apiHandler.initialize(serverRestify, name, ver, apiToken);
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
  // Simple validation
  if (!serverRestify) {
    return new fperr.FlagpoleErr('ERR_FLAGPOLE_NOT_INIT');
  }
  if (!name || !ver) {
    return new fperr.FlagpoleErr('ERR_BAD_ARG');
  }

  // Try to load up the file
  var newAPI;
  var safeFileName = buildSafePath(fileName);
  try {
    newAPI = require(safeFileName);
  } catch(error) {
    return new fperr.FlagpoleErr('ERR_FILE_LOAD', 'Could not load API file', error);
  }
  return registerAPIDirect(name,
                           descriptiveName,
                           description,
                           ver,
                           newAPI,
                           safeFileName);
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC init(server: Required, Restify server instance)                 **
 **                                                                        **
 ****************************************************************************/

function initialize(server, opts)
{
  // Simple validation
  if (!server) {
    throw new fperr.FlagpoleErr('ERR_BAD_ARG');
  }

  // Set it all up
  serverRestify = server;
  requestTypes.set('get',   serverRestify.get);
  requestTypes.set('post',  serverRestify.post);
  requestTypes.set('put',   serverRestify.put);
  requestTypes.set('patch', serverRestify.patch);
  requestTypes.set('del',   serverRestify.del);
  requestTypes.set('opts',  serverRestify.opts);

  // API dir?
  if (opts && opts.apiDir) {
    apiDir = path.resolve(opts.apiDir) + path.sep;
  }
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
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC unregisterAPI(...)                                              **
 **                                                                        **
 ****************************************************************************/

function unregisterAPI(nameOrToken, ver)
{
  var found = false;

  // Simple validation
  if (!serverRestify) {
    return new fperr.FlagpoleErr('ERR_FLAGPOLE_NOT_INIT');
  }

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
        // remove ALL versions of this API, including this one
        (!ver && apiInfo.name === nameOrToken)) {

      // Out with the routes and keep out of map
      unregisterAPIInfo(apiInfo);
      found = true;
      return false;
    }

    // Keep in the map
    return true;
  });

  // Was it found?
  if (!found) {
    return new fperr.FlagpoleErr('ERR_API_NOT_FOUND');
  }
}


/****************************************************************************
 **                                                                        **
 ** PUBLIC loadAPIConfig(...)                                              **
 **                                                                        **
 ****************************************************************************/

function loadAPIConfig(configFile)
{
  // Simple validation
  if (!serverRestify) {
    return new fperr.FlagpoleErr('ERR_FLAGPOLE_NOT_INIT');
  }

  // Load up the file
  var config;
  var safeFileName = buildSafePath(configFile);
  try {
    config = require(safeFileName);
  } catch(error) {
    return new fperr.FlagpoleErr('ERR_FILE_LOAD', 'Could not load config file', error);
  }

  // Now process the config data
  try {
    var apis = config['apis'];

    // Process each api in return
    apis.forEach((api) => {
      if (api.versions) {
        api.versions.forEach((ver) => {
            var err = registerAPI(api.name,
                                  api.descriptiveName,
                                  api.description,
                                  ver.ver,
                                  ver.fileName);
            if (err) {
              return err;
            }
        });
      }
    });
  } catch(error) {
    return new fperr.FlagpoleErr('ERR_CONFIG', 'Could not process config file', error);
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
    apis.push(_.pick(newAPI, [
      "name",
      "descriptiveName",
      "description",
      "ver",
      "apiToken",
      "fileName"
    ]));
  });

  return apis;
}


module.exports = { initialize,
                   loadAPIConfig,
                   registerAPI,
                   unregisterAPI,
                   queryAPIs };
