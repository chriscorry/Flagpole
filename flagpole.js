const restify = require('restify');
const _       = require('lodash');

var serverRestify;
var requestTypes          = new Map();
var registeredAPIsByToken = new Map();


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

function registerAPI(name,
                     descriptiveName,
                     description,
                     ver,
                     apiHandler)
{
  // Simple validation
  if (!serverRestify || !name || !ver || !apiHandler) {
    return Promise.reject(false);
  }

  // Validate version format
  if (!ver.match(/(\d+\.)?(\d+\.)?(\d+)/)) {
    return Promise.reject(false);
  }

  // Create our new API token
  var apiToken = _.lowerCase(_.trim(name)) + ':' + ver.toString();

  // TODO Has this API already been registered?

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
          funcRequestHandler.call(serverRestify, {path: pathInfo.path, version: newAPI.ver}, pathInfo.handler)
        }
      }
    });
  }
  catch (err) {
    return Promise.reject(false);
  }

  // Add to the main API collection
  registeredAPIsByToken.set(apiToken, newAPI);

  return Promise.resolve(true);
}

module.exports = { init, registerAPI };
