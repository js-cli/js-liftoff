'use strict';

var isPlainObject = require('is-plain-object');
var mapValues = require('object.map');
var fined = require('fined');
var registerLoader = require('./register_loader');

var notFound = { path: null };

function findConfigFiles(configFiles, env, extensions, eventEmitter) {
  if (!isPlainObject(configFiles)) {
    return {};
  }

  return mapValues(configFiles, function(prop, name) {
    eventEmitter.emit('beforeFindConfigFile', name, env);
    return mapValues(prop, function(pathObj, dir) {
      var defaultObj = { name: name, cwd: env.cwd, extensions: extensions };
      var found = fined(pathObj, defaultObj) || notFound;
      if (isPlainObject(found.extension)) {
        registerLoader(eventEmitter, found.extension, found.path, env.cwd);
        eventEmitter.emit('findConfigFile', name, dir, found.path, env);
      }
      return found.path;
    });
  });
}

module.exports = findConfigFiles;
