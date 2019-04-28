'use strict';

var util = require('util');
var EE = require('events').EventEmitter;

var extend = require('extend');
var resolve = require('resolve');
var flaggedRespawn = require('flagged-respawn');
var assign = require('object-assign');

var parseOptions = require('./lib/parse_options');
var buildConfigName = require('./lib/build_config_name');
var getNodeFlags = require('./lib/get_node_flags');

var changeEnvPaths = require('./lib/change_env_paths');
var findConfigFiles = require('./lib/find_config_files');
var findModule = require('./lib/find_module');
var preloadModules = require('./lib/preload_modules');

function Liftoff(opts) {
  EE.call(this);
  extend(this, parseOptions(opts));
}
util.inherits(Liftoff, EE);

Liftoff.prototype.changeEnvPaths = function(env, opts) {
  var changed = changeEnvPaths(opts, env.configNameSearch, this.searchPaths);
  return assign(env, changed);
};

Liftoff.prototype.findConfigFiles = function(env, configFiles) {
  return findConfigFiles(configFiles, env, this.extensions, this);
};

Liftoff.prototype.requireLocal = function(module, basedir) {
  try {
    this.emit('beforeRequire', module);
    var result = require(resolve.sync(module, { basedir: basedir }));
    this.emit('require', module, result);
    return result;
  } catch (e) {
    this.emit('requireFail', module, e);
  }
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

  opts = opts || {};

  var completion = opts.completion;
  if (completion && this.completions) {
    return this.completions(completion);
  }

  // calculate the regex to use for finding the config file
  var configNameSearch = buildConfigName({
    configName: this.configName,
    extensions: Object.keys(this.extensions),
  });

  var env = {
    require: [].concat(opts.require || []),
    configNameSearch: configNameSearch,
  };
  assign(env, this.changeEnvPaths(env, opts));
  env.configFiles = this.findConfigFiles(env, this.configFiles);
  assign(env, findModule(this.moduleName, env.configBase, env.cwd));

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
        fn.call(this, env, argv);
      }
    }
  }.bind(this));
};

module.exports = Liftoff;
