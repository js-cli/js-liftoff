var util = require('util');
var path = require('path');
var EE = require('events').EventEmitter;

var extend = require('extend');
var resolve = require('resolve');
var flaggedRespawn = require('flagged-respawn');
var isPlainObject = require('is-plain-object');
var mapValues = require('object.map');
var fined = require('fined');

var findCwd = require('./lib/find_cwd');
var arrayFind = require('./lib/array_find');
var findConfig = require('./lib/find_config');
var fileSearch = require('./lib/file_search');
var needsLookup = require('./lib/needs_lookup');
var parseOptions = require('./lib/parse_options');
var silentRequire = require('./lib/silent_require');
var buildConfigName = require('./lib/build_config_name');
var registerLoader = require('./lib/register_loader');
var getNodeFlags = require('./lib/get_node_flags');

function Liftoff(opts) {
  EE.call(this);
  extend(this, parseOptions(opts));
}
util.inherits(Liftoff, EE);

Liftoff.prototype.requireLocal = function(moduleName, basedir) {
  try {
    this.emit('beforeRequire', moduleName);
    var result = require(resolve.sync(moduleName, { basedir: basedir }));
    this.emit('require', moduleName, result);
    return result;
  } catch (e) {
    this.emit('requireFail', moduleName, e);
  }
};

Liftoff.prototype.buildEnvironment = function(opts) {
  opts = opts || {};

  // get modules we want to preload
  var preload = opts.require || [];

  // ensure items to preload is an array
  if (!Array.isArray(preload)) {
    preload = [preload];
  }

  // make a copy of search paths that can be mutated for this run
  var searchPaths = this.searchPaths.slice();

  // calculate current cwd
  var cwd = findCwd(opts);

  var exts = this.extensions;
  var eventEmitter = this;

  function findAndRegisterLoader(pathObj, defaultObj) {
    var found = fined(pathObj, defaultObj);
    if (!found) {
      // TODO: Should this actually error on not found?
      // throw new Error('Unable to find extends file: ' + xtends.path);
      return;
    }
    if (isPlainObject(found.extension)) {
      registerLoader(eventEmitter, found.extension, found.path, cwd);
    }
    return found.path;
  }

  function getModulePath(cwd, xtends) {
    // If relative, we need to use fined to look up the file. If not, assume a node_module
    if (needsLookup(xtends)) {
      var defaultObj = { cwd: cwd, extensions: exts };
      // Using `xtends` like this should allow people to use a string or any object that fined accepts
      return findAndRegisterLoader(xtends, defaultObj);
    }

    return xtends;
  }

  var visited = {};
  function loadConfig(cwd, xtends, prev) {
    var configFilePath = getModulePath(cwd, xtends);
    if (!configFilePath) {
      return prev;
    }

    if (visited[configFilePath]) {
      // TODO: emit warning about recursion
      // throw new Error('We encountered a recursive extend for file: ' + configFilePath + '. Please remove the recursive extends.');
      return prev;
    }
    // TODO: this should emit a warning if the configFile could not be loaded
    var configFile = silentRequire(configFilePath);
    visited[configFilePath] = true;
    if (configFile && configFile.extends) {
      var nextCwd = path.dirname(configFilePath);
      return loadConfig(nextCwd, configFile.extends, configFile);
    }
    return extend(true /* deep */, prev, configFile || {});
  }

  var configFiles = {};
  if (isPlainObject(this.configFiles)) {
    configFiles = mapValues(this.configFiles, function(searchPaths, fileStem) {
      var defaultObj = { name: fileStem, cwd: cwd, extensions: exts };

      var foundPath = arrayFind(searchPaths, function(pathObj) {
        return findAndRegisterLoader(pathObj, defaultObj);
      });

      return foundPath;
    });
  }

  var config = mapValues(configFiles, function(startingLocation) {
    var defaultConfig = {};
    if (!startingLocation) {
      return defaultConfig;
    }

    var config = loadConfig(cwd, startingLocation, defaultConfig);
    // TODO: better filter?
    delete config.extends;
    return config;
  });

  // if cwd was provided explicitly, only use it for searching config
  if (opts.cwd) {
    searchPaths = [cwd];
  } else {
    // otherwise just search in cwd first
    searchPaths.unshift(cwd);
  }

  // calculate the regex to use for finding the config file
  var configNameSearch = buildConfigName({
    configName: this.configName,
    extensions: Object.keys(this.extensions),
  });

  // calculate configPath
  var configPath = findConfig({
    configNameSearch: configNameSearch,
    searchPaths: searchPaths,
    configPath: opts.configPath,
  });

  // if we have a config path, save the directory it resides in.
  var configBase;
  if (configPath) {
    configBase = path.dirname(configPath);
    // if cwd wasn't provided explicitly, it should match configBase
    if (!opts.cwd) {
      cwd = configBase;
    }
  }

  // TODO: break this out into lib/
  // locate local module and package next to config or explicitly provided cwd
  /* eslint one-var: 0 */
  var modulePath, modulePackage;
  try {
    var delim = path.delimiter;
    var paths = (process.env.NODE_PATH ? process.env.NODE_PATH.split(delim) : []);
    modulePath = resolve.sync(this.moduleName, { basedir: configBase || cwd, paths: paths });
    modulePackage = silentRequire(fileSearch('package.json', [modulePath]));
  } catch (e) {}

  // if we have a configuration but we failed to find a local module, maybe
  // we are developing against ourselves?
  if (!modulePath && configPath) {
    // check the package.json sibling to our config to see if its `name`
    // matches the module we're looking for
    var modulePackagePath = fileSearch('package.json', [configBase]);
    modulePackage = silentRequire(modulePackagePath);
    if (modulePackage && modulePackage.name === this.moduleName) {
      // if it does, our module path is `main` inside package.json
      modulePath = path.join(path.dirname(modulePackagePath), modulePackage.main || 'index.js');
      cwd = configBase;
    } else {
      // clear if we just required a package for some other project
      modulePackage = {};
    }
  }

  return {
    cwd: cwd,
    require: preload,
    configNameSearch: configNameSearch,
    configPath: configPath,
    configBase: configBase,
    modulePath: modulePath,
    modulePackage: modulePackage || {},
    configFiles: configFiles,
    config: config,
  };
};

Liftoff.prototype.handleFlags = function(cb) {
  if (typeof this.v8flags === 'function') {
    this.v8flags(function(err, flags) {
      if (err) {
        cb(err);
      } else {
        cb(null, flags);
      }
    });
  } else {
    process.nextTick(function() {
      cb(null, this.v8flags);
    }.bind(this));
  }
};

Liftoff.prototype.prepare = function(opts, fn) {
  if (typeof fn !== 'function') {
    throw new Error('You must provide a callback function.');
  }

  process.title = this.processTitle;

  var completion = opts.completion;
  if (completion && this.completions) {
    return this.completions(completion);
  }

  var env = this.buildEnvironment(opts);

  fn.call(this, env);
};

Liftoff.prototype.execute = function(env, forcedFlags, fn) {
  if (typeof forcedFlags === 'function') {
    fn = forcedFlags;
    forcedFlags = undefined;
  }
  if (typeof fn !== 'function') {
    throw new Error('You must provide a callback function.');
  }

  this.handleFlags(function(err, flags) {
    if (err) {
      throw err;
    }
    flags = flags || [];

    flaggedRespawn(flags, process.argv, forcedFlags, execute.bind(this));

    function execute(ready, child, argv) {
      if (child !== process) {
        var execArgv = getNodeFlags.fromReorderedArgv(argv);
        this.emit('respawn', execArgv, child);
      }
      if (ready) {
        preloadModules(this, env);
        registerLoader(this, this.extensions, env.configPath, env.cwd);
        fn.call(this, env, argv);
      }
    }
  }.bind(this));
};

function preloadModules(inst, env) {
  var basedir = env.cwd;
  env.require.filter(toUnique).forEach(function(module) {
    inst.requireLocal(module, basedir);
  });
}

function toUnique(elem, index, array) {
  return array.indexOf(elem) === index;
}

module.exports = Liftoff;
