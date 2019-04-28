'use strict';

var path = require('path');
var fileSearch = require('./file_search');

function changeEnvPaths(opts, configNameSearch, searchPaths) {
  var cwd, configPath, configBase;

  if (opts.cwd) {
    cwd = path.resolve(opts.cwd);
    if (opts.configPath) {
      configPath = path.resolve(opts.configPath);
    } else {
      searchPaths = [cwd];
      configPath = fileSearch(configNameSearch, searchPaths);
    }
    if (configPath) {
      configBase = path.dirname(configPath);
    }

  } else if (opts.configPath) {
    configPath = path.resolve(opts.configPath);
    configBase = path.dirname(configPath);
    cwd = configBase;

  } else {
    cwd = process.cwd();
    searchPaths = [cwd].concat(searchPaths);
    configPath = fileSearch(configNameSearch, searchPaths);
    if (configPath) {
      configBase = path.dirname(configPath);
      cwd = configBase;
    }
  }

  return {
    cwd: cwd,
    configPath: configPath,
    configBase: configBase,
    configNameSearch: configNameSearch,
  };
}

module.exports = changeEnvPaths;
