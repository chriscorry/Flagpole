const path             = require('path');
const fs               = require('fs');
const restify          = require('restify');
const _                = require('lodash');
const utils            = require('../util/pancake-utils');
const { PancakeError } = require('../util/pancake-err');


var serverRestify;
var log                   = utils.log;
var apiSearchDirs         = [];
var requestTypes          = new Map();
var registeredAPIsByToken = new Map();


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
    log.trace('FP: ERR_FLAGPOLE_NOT_INIT');
    return new PancakeError('ERR_FLAGPOLE_NOT_INIT');
  }
  if (!name || !ver || !apiHandler) {
    log.trace('FP: ERR_BAD_ARG');
    return new PancakeError('ERR_BAD_ARG');
  }

  // Validate version format
  if (!ver.match(/(\d+\.)?(\d+\.)?(\d+)/)) {
    log.trace('FP: ERR_BAD_ARG: Invalid version format');
    return new PancakeError('ERR_BAD_ARG', 'Invalid version format');
  }

  // Create our new API token
  name = _.toLower(_.trim(name));
  var apiToken = name + ':' + _.trim(ver);

  // Has this API already been registered?
  if (registeredAPIsByToken.get(apiToken)) {

    // Unregister what's currently there
    unregisterAPI(apiToken);
    log.trace('FP: Overwriting api %s', apiToken);
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
          log.trace(`FP: Registered route (${pathInfo.path}, ${newAPI.ver})`);
        }
      }
      else {
        log.trace(`FP: ERR_REGISTER_ROUTE: Bad request type: "${pathInfo.requestType}"`);
        throw new PancakeError('ERR_REGISTER_ROUTE',
                               `Bad request type: "${pathInfo.requestType}"`);
      }
    });
  }
  catch (error) {
    if (error instanceof fperr.FlagpoleErr) {
      return error;
    }
    log.trace(`FP: ERR_REGISTER_ROUTE: Could not register route: "${pathInfo.requestType}", "${pathInfo.path}", ${newAPI.ver}`);
    return new PancakeError('ERR_REGISTER_ROUTE',
                            `Could not register route: "${pathInfo.requestType}", "${pathInfo.path}", ${newAPI.ver}`,
                            error);
  }

  // Add to the main API collection
  registeredAPIsByToken.set(apiToken, newAPI);
  log.trace(`FP: New API "${apiToken}" registered.`);

  // Let the API know
  if (newAPI.apiHandler.initialize) {
    log.trace(`FP: Calling API initializer`);
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
    log.trace(`FP: ERR_FLAGPOLE_NOT_INIT`);
    return new PancakeError('ERR_FLAGPOLE_NOT_INIT');
  }
  if (!name || !ver) {
    log.trace(`FP: ERR_BAD_ARG`);
    return new PancakeError('ERR_BAD_ARG');
  }

  // Try to load up the file
  var newAPI, err;
  apiSearchDirs.find((apiDir) => {

    // Search through each api dir
    var safeFileName = utils.buildSafeFileName(fileName, apiDir);
    if (fs.existsSync(safeFileName)) {
      try {
        // Load it...
        newAPI = require(safeFileName);

        // ... and register it
        err = registerAPIDirect(name,
                                descriptiveName,
                                description,
                                ver,
                                newAPI,
                                safeFileName);

      // Swallow the exception
      } catch(error) {
        err = error;
      }
      return true;
    }
  });

  // No dice
  if (!newAPI) {
    log.trace(`FP: ERR_FILE_LOAD: Could not load API file ${fileName}`, err);
    return new PancakeError('ERR_FILE_LOAD', `Could not load API file ${fileName}`, err);
  }
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
    log.trace(`FP: ERR_BAD_ARG: Restify server instance not provided`);
    throw new PancakeError('ERR_BAD_ARG');
  }

  // Set it all up
  serverRestify = server;
  requestTypes.set('get',   serverRestify.get);
  requestTypes.set('post',  serverRestify.post);
  requestTypes.set('put',   serverRestify.put);
  requestTypes.set('patch', serverRestify.patch);
  requestTypes.set('del',   serverRestify.del);
  requestTypes.set('opts',  serverRestify.opts);

  // API dirs
  if (opts && opts.apiSearchDirs) {
    opts.apiSearchDirs.split(path.delimiter).forEach((dir) => {
      apiSearchDirs.push(path.resolve(dir) + path.sep);
    });
  }
  else {
    apiSearchDirs = [ '.' + path.sep ];
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
    log.trace(`FP: Unregistered route (${pathInfo.route})`);
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

    // Remove routes
    unregisterAPIInfo(apiInfo);

    // Unload modules from the cache
    if (apiInfo.fileName) {
      delete require.cache[require.resolve(apiInfo.fileName)];
      log.trace(`FP: Removed module (${apiInfo.fileName}) from Node cache.`);
    }

    // Let the API know
    if (apiInfo.apiHandler.terminate) {
      log.trace(`FP: Calling API terminator`);
      apiInfo.apiHandler.terminate();
    }
  });

  // Wipe the collection
  registeredAPIsByToken.clear();
  log.trace(`FP: All APIs unregistered.`);
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
    log.trace(`FP: ERR_FLAGPOLE_NOT_INIT`);
    return new PancakeError('ERR_FLAGPOLE_NOT_INIT');
  }

  // No args means wipe them all out
  if (!nameOrToken && !ver) {
    return unregisterAllAPIs();
  }

  // Move through the map and process each item
  registeredAPIsByToken = utils.filterMap(registeredAPIsByToken, (apiToken, apiInfo) => {

    // If a version was specified, nameOrToken is a name and only the
    // specified version should be removed
    if ((ver && apiInfo.name === nameOrToken && apiInfo.ver === ver) ||

        // If a version was NOT specified and the tokens match, that's our target
        (!ver && apiInfo.apiToken === nameOrToken) ||

        // If a version was NOT specified and the names match, we want to
        // remove ALL versions of this API, including this one
        (!ver && apiInfo.name === nameOrToken)) {

      // Out with the routes, remove from the cache, and keep out of map
      unregisterAPIInfo(apiInfo);
      if (apiInfo.fileName) {
        delete require.cache[require.resolve(apiInfo.fileName)];
        log.trace(`FP: Removed module (${apiInfo.fileName}) from Node cache.`);
      }
      found = true;
      return false;
    }

    // Keep in the map
    return true;
  });

  // Was it found?
  if (!found) {
    log.trace(`FP: ERR_API_NOT_FOUND: Could not find API (${nameOrToken}, ${ver}) to unregister.`);
    return new PancakeError('ERR_API_NOT_FOUND');
  }
  else {
    log.trace(`FP: API (${nameOrToken}, ${ver}) successfully unregistered.`);
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
    log.trace(`FP: ERR_FLAGPOLE_NOT_INIT`);
    return new PancakeError('ERR_FLAGPOLE_NOT_INIT');
  }
  if (!configFile) {
    log.trace(`FP: ERR_NO_CONFIG_FILE`);
    return new PancakeError('ERR_NO_CONFIG_FILE');
  }

  // Load up the file
  var config, err, safeFileName;
  apiSearchDirs.find((apiDir) => {

    // Search through each api dir
    var safeFileName = utils.buildSafeFileName(configFile, apiDir);
    if (fs.existsSync(safeFileName)) {
      try {
        config = require(safeFileName);
        log.trace(`FP: Loading API config file (${safeFileName})...`);
      } catch(error) {
        err = error;
      }
      return true;
    }
  });
  if (!config) {
    log.trace(`FP: ERR_FILE_LOAD: Could not load API config file (${configFile})`);
    if (err) log.trace(err);
    return new PancakeError('ERR_FILE_LOAD', `Could not load API config file (${configFile})`, err);
  }

  // Now process the config data
  err = undefined;
  try {
    var apis = config.apis;

    // Process each api in return
    apis.forEach((api) => {
      if (api.versions && !err) {
        api.versions.forEach((ver) => {
            if (!err) {
              err = registerAPI(api.name,
                                api.descriptiveName,
                                api.description,
                                ver.ver,
                                ver.fileName);
            }
        });
      }
    });
  } catch(error) {
    log.trace(`FP: ERR_CONFIG: Could not process config file.`);
    log.trace(error);
    return new PancakeError('ERR_CONFIG', 'Could not process config file.', error);
  }
  return err;
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

  log.trace(`FP: Returned list of APIs.`);
  return apis;
}


module.exports = { initialize,
                   loadAPIConfig,
                   registerAPI,
                   unregisterAPI,
                   queryAPIs };
