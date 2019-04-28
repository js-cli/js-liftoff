'use strict';

var registerLoader = require('./register_loader');

function preloadModules(app, env) {
  var basedir = env.cwd;
  env.require.filter(toUnique).forEach(function(module) {
    app.requireLocal(module, basedir);
  });
  registerLoader(app, app.extensions, env.configPath, env.cwd);
}

function toUnique(elem, index, array) {
  return array.indexOf(elem) === index;
}

module.exports = preloadModules;
