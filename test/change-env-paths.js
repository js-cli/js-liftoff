'use strict';

var Liftoff = require('../');
var expect = require('chai').expect;
var path = require('path');

var dir = path.resolve(__dirname, 'fixtures/change-env-paths');
var cwd = process.cwd();

describe('Change env.cwd and env.configPath', function() {

  after(function() {
    process.chdir(cwd);
  });

  describe('No configFiles', function() {
    it('should set env.cwd to initial cwd with no option and no config file', function(done) {
      //
      // a/  <== initial cwd and final cwd
      //   .app.json
      //   appfile.js
      //   package.json   : { "name": "app" }
      //
      process.chdir(path.join(dir, 'a'));
      var app = new Liftoff({ name: 'app' });
      app.on('beforeFindConfigFile', function() { expect.fail(); });
      app.on('findConfigFile', function() { expect.fail(); });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'a'));
        expect(env.configPath).to.equal(path.join(dir, 'a/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'a'));
        expect(env.modulePath).to.equal(path.join(dir, 'a/index.js'));
        done();
      });
    });

    it('should set env paths to the directory found up from initial cwd with no option and no config file', function(done) {
      //
      // a/  <== [2] final cwd found up
      //   .app.json
      //   appfile.js
      //   package.json  : { "name": "app" }
      //   b/  <== [1] initial cwd
      //
      process.chdir(path.join(dir, 'a/b'));
      var app = new Liftoff({ name: 'app' });
      app.on('beforeFindConfigFile', function() { expect.fail(); });
      app.on('findConfigFile', function() { expect.fail(); });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'a'));
        expect(env.configPath).to.equal(path.join(dir, 'a/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'a'));
        expect(env.modulePath).to.equal(path.join(dir, 'a/index.js'));
        done();
      });
    });

    it('should change env paths by opts.cwd', function(done) {
      //
      // a/  <== [1] initial cwd
      //   .app.json
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [2] final cwd changed by opts.cwd
      //
      process.chdir(path.join(dir, 'a'));
      var app = new Liftoff({ name: 'app' });
      app.on('beforeFindConfigFile', function() { expect.fail(); });
      app.on('findConfigFile', function() { expect.fail(); });
      app.prepare({ cwd: '../c' }, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        done();
      });
    });

    it('should change env paths by opts.cwd and find up', function(done) {
      //
      // a/  <== [1] initial cwd
      //   .app.json
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [3] final cwd found up
      //   d/  <== [2] cwd changed by opts.cwd
      //
      process.chdir(path.join(dir, 'a'));
      var app = new Liftoff({ name: 'app' });
      app.on('beforeFindConfigFile', function() { expect.fail(); });
      app.on('findConfigFile', function() { expect.fail(); });
      app.prepare({ cwd: '../c/d' }, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c/d'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        done();
      });
    });

    it('should change env paths by opts.configPath', function(done) {
      //
      // a/  <== [1] initial cwd
      //   .app.json
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [2] final cwd changed by opts.configPath
      //   appfile.js
      //
      process.chdir(path.join(dir, 'a'));
      var app = new Liftoff({ name: 'app' });
      app.on('beforeFindConfigFile', function() { expect.fail(); });
      app.on('findConfigFile', function() { expect.fail(); });
      app.prepare({ configPath: '../c/appfile.js' }, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        done();
      });
    });

    it('should change env paths by opts.cwd and opts.configPath', function(done) {
      //
      // a/  <== [1] initial cwd
      //   .app.json
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [2] final cwd changed by opts.configPath
      //   appfile.js
      //
      process.chdir(path.join(dir, 'a'));
      var app = new Liftoff({ name: 'app' });
      app.on('beforeFindConfigFile', function() { expect.fail(); });
      app.on('findConfigFile', function() { expect.fail(); });
      app.prepare({ cwd: '../c', configPath: './appfile.js' }, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'a/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'a'));
        expect(env.modulePath).to.equal(path.join(dir, 'a/index.js'));
        done();
      });
    });
  });

  describe('Use a config file in a cwd', function() {
    it('should change env paths by a config file', function(done) {
      //
      // a/  <== [1] initial cwd
      //   .app.json  : { "cwd": "../c" }
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [2] final cwd changed by a/.app.json
      //   .app.json  (not used)
      //   appfile.js
      //   package.json  : { "name": "app" }
      //
      process.chdir(path.join(dir, 'a'));
      var app = new Liftoff({
        name: 'app',
        configFiles: {
          '.app': { cwd: { path: '.' } },
        },
      });
      var eventLogs = [];
      app.on('beforeFindConfigFile', function(name, env) {
        eventLogs.push(['beforeFindConfigFile', name, env.cwd]);
      });
      app.on('findConfigFile', function(name, dir, fpath, env) {
        eventLogs.push(['findConfigFile', name, dir, fpath, env.cwd]);
        var cfg = require(fpath);
        app.changeEnvPaths(env, { cwd: path.join(env.cwd, cfg.cwd) });
      });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        expect(eventLogs).to.deep.equal([
          ['beforeFindConfigFile', '.app', path.join(dir, 'a')],
          ['findConfigFile', '.app', 'cwd', path.join(dir, 'a/.app.json'),
           path.join(dir, 'a')],
        ]);
        done();
      });
    });

    it('should find up and change env paths by a config file', function(done) {
      //
      // a/  <== [2] found up
      //   .app.json  : { "cwd": "../c" }
      //   appfile.js
      //   package.json  : { "name": "app" }
      //   b/  <== [1] initial cwd
      //     .app.json  (not used)
      // c/  <== [3] final cwd changed by a/.app.json
      //   .app.json  (not used)
      //   appfile.js
      //   package.json  : { "name": "app" }
      //
      process.chdir(path.join(dir, 'a/b'));
      var app = new Liftoff({
        name: 'app',
        configFiles: {
          '.app': { cwd: { path: '.' } },
        },
      });
      var eventLogs = [];
      app.on('beforeFindConfigFile', function(name, env) {
        eventLogs.push(['beforeFindConfigFile', name, env.cwd]);
      });
      app.on('findConfigFile', function(name, dir, fpath, env) {
        eventLogs.push(['findConfigFile', name, dir, fpath, env.cwd]);
        var cfg = require(fpath);
        app.changeEnvPaths(env, { cwd: path.join(env.cwd, cfg.cwd) });
      });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        expect(eventLogs).to.deep.equal([
          ['beforeFindConfigFile', '.app', path.join(dir, 'a')],
          ['findConfigFile', '.app', 'cwd', path.join(dir, 'a/.app.json'),
           path.join(dir, 'a')],
        ]);
        done();
      });
    });

    it('should change env paths by a config file and find up configBase', function(done) {
      //
      // a/  <== [3] final configBase found up
      //   .app.json  : (not used)
      //   appfile.js
      //   package.json  : { "name": "app" }
      //   b/  <== [2] final cwd changed by c/.app.json
      //     .app.json  (not used)
      // c/  <== [1] initial cwd
      //   .app.json  : { "cwd": "../a/b" }
      //   appfile.js
      //   package.json  : { "name": "app" }
      //
      process.chdir(path.join(dir, 'c'));
      var app = new Liftoff({
        name: 'app',
        configFiles: {
          '.app': { cwd: { path: '.' } },
        },
      });
      var eventLogs = [];
      app.on('beforeFindConfigFile', function(name, env) {
        eventLogs.push(['beforeFindConfigFile', name, env.cwd]);
      });
      app.on('findConfigFile', function(name, dir, fpath, env) {
        eventLogs.push(['findConfigFile', name, dir, fpath, env.cwd]);
        var cfg = require(fpath);
        app.changeEnvPaths(env, { cwd: path.join(env.cwd, cfg.cwd) });
      });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'a/b'));
        expect(env.configPath).to.equal(path.join(dir, 'a/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'a'));
        expect(env.modulePath).to.equal(path.join(dir, 'a/index.js'));
        expect(eventLogs).to.deep.equal([
          ['beforeFindConfigFile', '.app', path.join(dir, 'c')],
          ['findConfigFile', '.app', 'cwd', path.join(dir, 'c/.app.json'),
           path.join(dir, 'c')],
        ]);
        done();
      });
    });

    it('should change env paths by a prepare option and then a config file', function(done) {
      //
      // a/  <== [2] cwd changed by opts.cwd
      //   .app.json  : { "cwd": "../c" }
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [3] final cwd changed by a/.app.json
      //   .app.json  (not used)
      //   appfile.js
      //   package.json  : { "name": "app" }
      // e/  <== [1] initial cwd
      //
      process.chdir(path.join(dir, 'e'));
      var app = new Liftoff({
        name: 'app',
        configFiles: {
          '.app': { cwd: { path: '.' } },
        },
      });
      var eventLogs = [];
      app.on('beforeFindConfigFile', function(name, env) {
        eventLogs.push(['beforeFindConfigFile', name, env.cwd]);
      });
      app.on('findConfigFile', function(name, dir, fpath, env) {
        eventLogs.push(['findConfigFile', name, dir, fpath, env.cwd]);
        var cfg = require(fpath);
        app.changeEnvPaths(env, { cwd: path.join(env.cwd, cfg.cwd) });
      });
      app.prepare({ cwd: '../a' }, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        expect(eventLogs).to.deep.equal([
          ['beforeFindConfigFile', '.app', path.join(dir, 'a')],
          ['findConfigFile', '.app', 'cwd', path.join(dir, 'a/.app.json'),
           path.join(dir, 'a')],
        ]);
        done();
      });
    });
  });

  describe('Use config files in initial and changed cwds', function() {
    it('should change env paths by config files in initial cwd and changed cwd', function(done) {
      //
      // a/  <== [2] cwd changed by e/f/.app.json
      //   .app.json  : { "cwd": "../c" }
      //   appfile.js
      //   package.json  : { "name": "app" }
      // c/  <== [3] final cwd changed by a/.app.json
      //   .app.json  (not used)
      //   appfile.js
      //   package.json  : { "name": "app" }
      // e/
      //   f/  <== [1] initial cwd
      //     .app.json  : { "cwd": "../../a" }
      //
      process.chdir(path.join(dir, 'e/f'));
      var app = new Liftoff({
        name: 'app',
        configFiles: {
          '.app': { initCwd: { path: process.cwd() }, cwd: { path: '.' } },
        },
      });
      var eventLogs = [];
      app.on('beforeFindConfigFile', function(name, env) {
        eventLogs.push(['beforeFindConfigFile', name, env.cwd]);
      });
      app.on('findConfigFile', function(name, dir, fpath, env) {
        eventLogs.push(['findConfigFile', name, dir, fpath, env.cwd]);
        var cfg = require(fpath);
        app.changeEnvPaths(env, { cwd: path.join(env.cwd, cfg.cwd) });
      });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'c'));
        expect(env.configPath).to.equal(path.join(dir, 'c/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'c'));
        expect(env.modulePath).to.equal(path.join(dir, 'c/index.js'));
        expect(eventLogs).to.deep.equal([
          ['beforeFindConfigFile', '.app', path.join(dir, 'e/f')],
          ['findConfigFile', '.app', 'initCwd', path.join(dir, 'e/f/.app.json'),
           path.join(dir, 'e/f')],
          ['findConfigFile', '.app', 'cwd', path.join(dir, 'a/.app.json'),
           path.join(dir, 'a')],
        ]);
        done();
      });
    });

    it('should change env paths by config files recursively', function(done) {
      //
      // a/  <== [2] cwd changed by e/f/.app.json
      //   .app.json  : { "cwd": "../c" }
      //   appfile.js
      //   package.json  : { "name": "app" }
      //   b/  <== [4] final cwd changed by c/.app.json (ended forcely)
      //     .app.json  : { "cwd": "../../e/f" } (not used)
      // c/  <== [3] cwd changed by a/.app.json
      //   .app.json  (not used)
      //   appfile.js
      //   package.json  : { "name": "app" }
      // e/
      //   f/  <== [1] initial cwd
      //     .app.json  : { "cwd": "../../a" }
      //
      process.chdir(path.join(dir, 'e/f'));
      var app = new Liftoff({
        name: 'app',
        configFiles: {
          '.app': { initCwd: { path: process.cwd() }, cwd: { path: '.' } },
        },
      });
      var eventLogs = [];
      app.on('beforeFindConfigFile', function(name, env) {
        eventLogs.push(['beforeFindConfigFile', name, env.cwd]);
      });
      var preventEndlessCirculation = {};
      app.on('findConfigFile', function(name, dir, fpath, env) {
        eventLogs.push(['findConfigFile', name, dir, fpath, env.cwd]);
        preventEndlessCirculation[env.cwd] = true;
        var cfg = require(fpath);
        var cwd = path.join(env.cwd, cfg.cwd);
        if (preventEndlessCirculation[cwd]) { return; }
        app.changeEnvPaths(env, { cwd: cwd });
        if (dir === 'cwd' || dir === 'recursion') {
          app.findConfigFiles(env, { '.app': { recursion: { path: '.' } } });
        }
      });
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.join(dir, 'a/b'));
        expect(env.configPath).to.equal(path.join(dir, 'a/appfile.js'));
        expect(env.configBase).to.equal(path.join(dir, 'a'));
        expect(env.modulePath).to.equal(path.join(dir, 'a/index.js'));
        expect(eventLogs).to.deep.equal([
          ['beforeFindConfigFile', '.app', path.join(dir, 'e/f')],
          ['findConfigFile', '.app', 'initCwd', path.join(dir, 'e/f/.app.json'),
           path.join(dir, 'e/f')],
          ['findConfigFile', '.app', 'cwd', path.join(dir, 'a/.app.json'),
           path.join(dir, 'a')],
          ['beforeFindConfigFile', '.app', path.join(dir, 'c')],
          ['findConfigFile', '.app', 'recursion', path.join(dir, 'c/.app.json'),
           path.join(dir, 'c')],
          ['beforeFindConfigFile', '.app', path.join(dir, 'a/b')],
          ['findConfigFile', '.app', 'recursion', path.join(dir, 'a/b/.app.json'),
           path.join(dir, 'a/b')],
        ]);
        done();
      });
    });
  });
});
