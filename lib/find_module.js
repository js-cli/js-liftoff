'use strict';

var path = require('path');
var resolve = require('resolve');
var fileSearch = require('./file_search');
var silentRequire = require('./silent_require');

function findModule(moduleName, configBase, cwd) {
  // locate local module and package next to config or explicitly provided cwd
  var modulePath, modulePackage;
  try {
    var delim = path.delimiter;
    var paths = (process.env.NODE_PATH ? process.env.NODE_PATH.split(delim) : []);
    modulePath = resolve.sync(moduleName, { basedir: configBase || cwd, paths: paths });
    modulePackage = silentRequire(fileSearch('package.json', [modulePath]));
  } catch (e) {}

  // if we have a configuration but we failed to find a local module, maybe
  // we are developing against ourselves?
  if (!modulePath && configBase) {
    // check the package.json sibling to our config to see if its `name`
    // matches the module we're looking for
    var modulePackagePath = fileSearch('package.json', [configBase]);
    modulePackage = silentRequire(modulePackagePath);
    if (modulePackage && modulePackage.name === moduleName) {
      // if it does, our module path is `main` inside package.json
      modulePath = path.join(path.dirname(modulePackagePath), modulePackage.main || 'index.js');
    } else {
      // clear if we just required a package for some other project
      modulePackage = {};
    }
  }

  return {
    modulePath: modulePath,
    modulePackage: modulePackage || {},
  };
}

module.exports = findModule;
