'use strict';

var expect = require('chai').expect;
var path = require('path');
var changeEnvPaths = require('../../lib/change_env_paths');

describe('changeEnvPaths', function() {

  describe('Both opts.cwd and opts.configPath are specified', function() {
    it('should use specified opts.cwd and opts.configPath', function(done) {
      var configNameSearch = ['mochafile.js', 'mochafile.coffee'];
      var searchPaths = ['search/paths'];

      var result = changeEnvPaths({
        cwd: 'a/b',
        configPath: 'c/d/appfile.js',
      }, configNameSearch, searchPaths);

      expect(result).to.deep.equal({
        cwd: path.join(process.cwd(), 'a/b'),
        configPath: path.join(process.cwd(), 'c/d/appfile.js'),
        configBase: path.join(process.cwd(), 'c/d'),
        configNameSearch: configNameSearch,
      });
      done();
    });

  });

  describe('Only opts.cwd are specified', function() {
    it('should use opts.cwd and search configPath', function(done) {
      var configNameSearch = ['mochafile.js', 'mochafile.coffee'];
      var searchPaths = ['search/paths'];

      var result = changeEnvPaths({
        cwd: path.join(__dirname, '../fixtures'),
      }, configNameSearch, searchPaths);

      expect(result).to.deep.equal({
        cwd: path.resolve(__dirname, '../fixtures'),
        configPath: path.join(__dirname, '../fixtures/mochafile.js'),
        configBase: path.join(__dirname, '../fixtures'),
        configNameSearch: configNameSearch,
      });
      done();
    });
  });

  describe('Only opts.configPath are specified', function() {
    it('should use opts.configPath and set the parent dir of configPath to opts', function(done) {
      var configNameSearch = ['mochafile.js', 'mochafile.coffee'];
      var searchPaths = ['search/paths'];

      var result = changeEnvPaths({
        configPath: 'a/b/c.js',
      }, configNameSearch, searchPaths);

      expect(result).to.deep.equal({
        cwd: path.resolve(process.cwd(), 'a/b'),
        configPath: path.resolve(process.cwd(), 'a/b/c.js'),
        configBase: path.resolve(process.cwd(), 'a/b'),
        configNameSearch: configNameSearch,
      });
      done();
    });
  });

  describe('Neither opts.cwd nor opts.configPath are specified', function() {
    it('should use the current dir for cwd and find a config file in the directory', function(done) {
      var cwd = process.cwd();
      process.chdir(path.join(__dirname, '../fixtures'));

      var configNameSearch = ['mochafile.js', 'mochafile.coffee'];
      var searchPaths = ['search/paths'];

      var result = changeEnvPaths({}, configNameSearch, searchPaths);

      expect(result).to.deep.equal({
        cwd: path.resolve(process.cwd()),
        configPath: path.resolve(process.cwd(), 'mochafile.js'),
        configBase: path.resolve(process.cwd()),
        configNameSearch: configNameSearch,
      });
      process.chdir(cwd);
      done();
    });
  });

  describe('Don\'t find a config file', function() {
    it('should set nullish to cwd and configPath', function(done) {
      var configNameSearch = ['mochafile.js', 'mochafile.coffee'];
      var searchPaths = ['search/paths'];

      var result = changeEnvPaths({}, configNameSearch, searchPaths);

      expect(result).to.deep.equal({
        cwd: path.resolve(process.cwd()),
        configPath: null,
        configBase: undefined,
        configNameSearch: configNameSearch,
      });
      done();
    });
  });
});
