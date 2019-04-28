var Liftoff = require('../');
var path = require('path');
var expect = require('chai').expect;
var sinon = require('sinon');
var resolve = require('resolve');
var exec = require('child_process').exec;

var NAME = 'mocha';
var app = new Liftoff({
  processTitle: NAME,
  configName: NAME + 'file',
  moduleName: NAME,
  extensions: {
    '.js': null,
    '.json': null,
    '.coffee': 'coffee-script/register',
    '.coffee.md': 'coffee-script/register',
  },
  searchPaths: ['test/fixtures/search_path'],
});

describe('Liftoff', function() {

  describe('prepare', function() {

    it('should locate local module using cwd if no config is found', function(done) {
      var test = new Liftoff({ name: 'chai' });
      var cwd = 'explicit/cwd';
      var spy = sinon.spy(resolve, 'sync');
      // NODE_PATH might be defined.
      delete process.env.NODE_PATH;
      test.prepare({ cwd: cwd }, function() {
        expect(spy.calledWith('chai', { basedir: path.join(process.cwd(), cwd), paths: [] })).to.be.true;
        spy.restore();
        done();
      });
    });

    it('should locate global module using NODE_PATH if defined', function(done) {
      var test = new Liftoff({ name: 'dummy' });
      var cwd = 'explicit/cwd';
      var spy = sinon.spy(resolve, 'sync');
      process.env.NODE_PATH = path.join(process.cwd(), cwd);
      test.prepare(null, function() {
        expect(spy.calledWith('dummy', { basedir: process.cwd(), paths: [path.join(process.cwd(), cwd)] })).to.be.true;
        spy.restore();
        done();
      });
    });

    it('if cwd is explicitly provided, don\'t use search_paths', function(done) {
      app.prepare({ cwd: './' }, function(env) {
        expect(env.configPath).to.equal(null);
        done();
      });
    });

    it('should find case sensitive configPath', function(done) {
      var expected = path.resolve(__dirname, 'fixtures', 'case', (process.platform === 'linux' ? 'Mochafile.js' : 'mochafile.js'));
      app.prepare({ cwd: path.join(__dirname, 'fixtures', 'case') }, function(env) {
        expect(env.configPath).to.equal(expected);
        done();
      });
    });

    it('should find module in the directory next to config', function(done) {
      app.prepare({}, function(env) {
        expect(env.modulePath).to.equal(path.resolve('node_modules/mocha/index.js'));
        done();
      });
    });

    it('should require the package sibling to the module', function(done) {
      app.prepare({}, function(env) {
        expect(env.modulePackage).to.equal(require('../node_modules/mocha/package.json'));
        done();
      });
    });

    it('should set cwd to match the directory of the config file as long as cwd wasn\'t explicitly provided', function(done) {
      app.prepare({}, function(env) {
        expect(env.cwd).to.equal(path.resolve('test/fixtures/search_path'));
        done();
      });
    });

    describe('for developing against yourself', function() {
      it('should find and load package.json', function(done) {
        var fixturesDir = path.resolve(__dirname, 'fixtures');
        var cwd = path.resolve(fixturesDir, 'developing_yourself');

        exec('cd ' + cwd + ' && node main.js', cb);
        function cb(err, stdout, stderr) {
          expect(err).to.equal(null);
          expect(stderr).to.equal('');
          var fp = path.resolve(cwd, 'package.json');
          expect(stdout).to.equal(
            JSON.stringify(require(fp)) + '\n' +
            path.resolve(cwd, 'main.js') + '\n' +
            cwd + '\n'
          );
          done();
        }
      });

      it('should clear modulePackage if package.json is of different project', function(done) {
        var fixturesDir = path.resolve(__dirname, 'fixtures');
        var cwd = path.resolve(fixturesDir, 'developing_yourself/app1');

        exec('cd ' + cwd + ' && node index.js', cb);
        function cb(err, stdout, stderr) {
          expect(err).to.equal(null);
          expect(stderr).to.equal('');
          expect(stdout).to.equal(
            '{}\n' +
            'undefined\n' +
            cwd + '\n'
          );
          done();
        }
      });

      it('should use `index.js` if `main` property in package.json does not exist', function(done) {
        var fixturesDir = path.resolve(__dirname, 'fixtures');
        var cwd = path.resolve(fixturesDir, 'developing_yourself/app2');

        exec('cd test/fixtures/developing_yourself/app2 && node index.js', cb);
        function cb(err, stdout, stderr) {
          expect(err).to.equal(null);
          expect(stderr).to.equal('');
          var fp = './fixtures/developing_yourself/app2/package.json';
          expect(stdout).to.equal(
            JSON.stringify(require(fp)) + '\n' +
            path.resolve(cwd, 'index.js') + '\n' +
            cwd + '\n'
          );
          done();
        }
      });

    });

    it('should set the process.title to the moduleName', function() {
      app.prepare({}, function() {});
      expect(process.title).to.equal(app.moduleName);
    });

    it('should return early if completions are available and requested', function(done) {
      var test = new Liftoff({
        name: 'whatever',
        completions: function() {
          done();
        },
      });
      test.prepare({ completion: true }, function() {});
    });

    it('should call prepare with liftoff instance as context', function(done) {
      app.prepare(null, function() {
        expect(this).to.equal(app);
        done();
      });
    });

    it('should throw if 2nd arg is not a function', function() {
      expect(function() {
        app.prepare({});
      }).to.throw();
    });
  });


  describe('execute', function() {
    it('should pass environment to first argument of execute callback', function(done) {
      app.prepare({}, function(testEnv) {
        app.execute(testEnv, function(env) {
          expect(env).to.deep.equal(testEnv);
          done();
        });
      });
    });

    it('should throw if 2nd arg is not a function', function() {
      expect(function() {
        app.execute({});
      }).to.throw();
    });

    it('should skip respawning if process.argv has no values from v8flags in it', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags.js', function(err, stdout, stderr) {
        expect(stderr).to.equal('\n');
        exec('node test/fixtures/prepare-execute/v8flags_function.js', function(err, stdout, stderr) {
          expect(stderr).to.equal('\n');
          done();
        });
      });
    });

    it('should respawn if process.argv has values from v8flags in it', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags.js --lazy', function(err, stdout, stderr) {
        expect(stderr).to.equal('--lazy\n');
        exec('node test/fixtures/prepare-execute/v8flags_function.js --lazy', function(err, stdout, stderr) {
          expect(stderr).to.equal('--lazy\n');
          done();
        });
      });
    });

    it('should throw if v8flags is a function and it causes an error', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags_error.js --lazy', function(err, stdout, stderr) {
        expect(err).not.to.equal(null);
        expect(stdout).to.equal('');
        expect(stderr).to.include('v8flags error!');
        done();
      });
    });

    it('should respawn if v8flag is set by forcedFlags', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags_config.js 123', cb);

      function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal([
          path.resolve('test/fixtures/prepare-execute/v8flags_config.js'),
          '123',
        ].join(' ') + '\n');
        expect(stdout).to.equal('saw respawn [ \'--lazy\' ]\n');
        done();
      }
    });

    it('should respawn if v8flag is set by both cli flag and forcedFlags', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags_config.js 123 --harmony abc', cb);

      function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal([
          path.resolve('test/fixtures/prepare-execute/v8flags_config.js'),
          '123',
          'abc',
        ].join(' ') + '\n');
        expect(stdout).to.equal('saw respawn [ \'--lazy\', \'--harmony\' ]\n');
        done();
      }
    });

    it('should emit a respawn event if a respawn is required', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags.js', function(err, stdout) {
        expect(stdout).to.be.empty;
        exec('node test/fixtures/prepare-execute/v8flags_function.js --lazy', function(err, stdout) {
          expect(stdout).to.equal('saw respawn\n');
          done();
        });
      });
    });

    it('should respawn if process.argv has v8flags with values in it', function(done) {
      exec('node test/fixtures/prepare-execute/v8flags_value.js --stack_size=2048', function(err, stdout, stderr) {
        expect(stderr).to.equal('--stack_size=2048\n');
        done();
      });
    });

    it('should respawn if v8flags is empty but forcedFlags are specified', function(done) {
      exec('node test/fixtures/prepare-execute/nodeflags_only.js 123', cb);

      function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal([
          path.resolve('test/fixtures/prepare-execute/nodeflags_only.js'),
          '123',
        ].join(' ') + '\n');
        expect(stdout).to.equal('saw respawn [ \'--lazy\' ]\n');
        done();
      }
    });
  });

  describe('requireLocal', function() {

    it('should attempt pre-loading local modules if they are requested', function(done) {
      var app = new Liftoff({ name: 'test' });
      var logs = [];
      app.on('require', function(moduleName, module) {
        expect(moduleName).to.equal('coffeescript/register');
        expect(module).to.equal(require('coffeescript/register'));
        logs.push('require');
      });
      app.on('requireFail', function(moduleName, err) {
        done(err);
      });
      app.prepare({ require: ['coffeescript/register'] }, function(env) {
        app.execute(env, function(env) {
          expect(env.require).to.deep.equal(['coffeescript/register']);
          expect(logs).to.deep.equal(['require']);
          done();
        });
      });
    });

    it('should attempt pre-loading a local module if it is requested', function(done) {
      var app = new Liftoff({ name: 'test' });
      var logs = [];
      app.on('require', function(moduleName, module) {
        expect(moduleName).to.equal('coffeescript/register');
        expect(module).to.equal(require('coffeescript/register'));
        logs.push('require');
      });
      app.on('requireFail', function(moduleName, err) {
        done(err);
      });
      app.prepare({ require: 'coffeescript/register' }, function(env) {
        app.execute(env, function(env) {
          expect(env.require).to.deep.equal(['coffeescript/register']);
          expect(logs).to.deep.equal(['require']);
          done();
        });
      });
    });

    it('should attempt pre-loading local modules but fail', function(done) {
      var app = new Liftoff({ name: 'test' });
      var logs = [];
      app.on('require', function(/* moduleName, module */) {
        done();
      });
      app.on('requireFail', function(moduleName, err) {
        expect(moduleName).to.equal('badmodule');
        expect(err).to.not.equal(null);
        logs.push('requireFail');
      });
      app.prepare({ require: 'badmodule' }, function(env) {
        app.execute(env, function(env) {
          expect(env.require).to.deep.equal(['badmodule']);
          expect(logs).to.deep.equal(['requireFail']);
          done();
        });
      });
    });

    it('should pre-load a local module only once even if be respawned', function(done) {
      var fixturesDir = path.resolve(__dirname, 'fixtures');

      exec('cd ' + fixturesDir + ' && node respawn_and_require.js', cb);
      function cb(err, stdout, stderr) {
        expect(err).to.equal(null);
        expect(stderr).to.equal('');
        expect(stdout).to.equal(
          'saw respawn [ \'--lazy\' ]\n' +
          'require coffeescript/register\n' +
          'execute\n' +
        '');
        done();
      }
    });

    it('should emit `beforeRequire` and `require` with the name of the module and the required module', function(done) {
      var requireTest = new Liftoff({ name: 'require' });
      var isEmittedBeforeRequired = false;
      requireTest.on('beforeRequire', function(name) {
        expect(name).to.equal('mocha');
        isEmittedBeforeRequired = true;
      });
      requireTest.on('require', function(name, module) {
        expect(name).to.equal('mocha');
        expect(module).to.equal(require('mocha'));
        expect(isEmittedBeforeRequired).to.equal(true);
        done();
      });
      requireTest.requireLocal('mocha', __dirname);
    });

    it('should emit `beforeRequire` and `requireFail` with an error if a module can\'t be found.', function(done) {
      var requireFailTest = new Liftoff({ name: 'requireFail' });
      var isEmittedBeforeRequired = false;
      requireFailTest.on('beforeRequire', function(name) {
        expect(name).to.equal('badmodule');
        isEmittedBeforeRequired = true;
      });
      requireFailTest.on('requireFail', function(name) {
        expect(name).to.equal('badmodule');
        expect(isEmittedBeforeRequired).to.equal(true);
        done();
      });
      requireFailTest.requireLocal('badmodule', __dirname);
    });

  });

  describe('configFiles', function() {
    it('should be empty if not specified', function(done) {
      var app = new Liftoff({
        name: 'myapp',
      });
      app.prepare({}, function(env) {
        expect(env.configFiles).to.deep.equal({});
        done();
      });
    });

    it('should find multiple files if specified', function(done) {
      var app = new Liftoff({
        name: 'myapp',
        configFiles: {
          index: {
            currentdir: '.',
            test: {
              path: 'test/fixtures/configfiles',
            },
            findingup: {
              path: 'test',
              cwd: 'test/fixtures/configfiles',
              findUp: true,
            },
          },
          package: {
            currentdir: '.',
            test: {
              path: 'test/fixtures/configfiles',
            },
            findingup: {
              path: 'test',
              cwd: 'test/fixtures/configfiles',
              findUp: true,
            },
          },
        },
      });
      app.prepare({}, function(env) {
        expect(env.configFiles).to.deep.equal({
          index: {
            currentdir: path.resolve('./index.js'),
            test: path.resolve('./test/fixtures/configfiles/index.json'),
            findingup: path.resolve('./test/index.js'),
          },
          package: {
            currentdir: path.resolve('./package.json'),
            test: null,
            findingup: null,
          },
        });
        done();
      });
    });

    it('should use default cwd if not specified', function(done) {
      var app = new Liftoff({
        name: 'myapp',
        configFiles: {
          index: {
            cwd: {
              path: '.',
              extensions: ['.js', '.json'],
            },
          },
        },
      });
      app.prepare({
        cwd: 'test/fixtures/configfiles',
      }, function(env) {
        expect(env.configFiles).to.deep.equal({
          index: {
            cwd: path.resolve('./test/fixtures/configfiles/index.json'),
          },
        });
        done();
      });
    });

    it('should use default extensions if not specified', function(done) {
      var app = new Liftoff({
        extensions: { '.md': null, '.txt': null },
        name: 'myapp',
        configFiles: {
          README: {
            markdown: {
              path: '.',
            },
            text: {
              path: 'test/fixtures/configfiles',
            },
            markdown2: {
              path: '.',
              extensions: ['.json', '.js'],
            },
            text2: {
              path: 'test/fixtures/configfiles',
              extensions: ['.json', '.js'],
            },
          },
        },
      });
      app.prepare({}, function(env) {
        expect(env.configFiles).to.deep.equal({
          README: {
            markdown: path.resolve('./README.md'),
            text: path.resolve('./test/fixtures/configfiles/README.txt'),
            markdown2: null,
            text2: null,
          },
        });
        done();
      });
    });

    it('should use specified loaders', function(done) {
      var logRequire = [];
      var logFailure = [];

      var app = new Liftoff({
        extensions: {
          '.md': './test/fixtures/configfiles/require-md',
        },
        name: 'myapp',
        configFiles: {
          README: {
            text_null: {
              path: 'test/fixtures/configfiles',
            },
            text_err: {
              path: 'test/fixtures/configfiles',
              extensions: {
                '.txt': './test/fixtures/configfiles/require-non-exist',
              },
            },
            text: {
              path: 'test/fixtures/configfiles',
              extensions: {
                '.txt': './test/fixtures/configfiles/require-txt',
              },
            },
            markdown: {
              path: '.',
            },
            markdown_badext: {
              path: '.',
              extensions: {
                '.txt': './test/fixtures/configfiles/require-txt',
              },
            },
            markdown_badext2: {
              path: '.',
              extensions: {
                '.txt': './test/fixtures/configfiles/require-non-exist',
              },
            },
          },
          // Intrinsic extension-loader mappings are prioritized.
          index: {
            test: {
              path: 'test/fixtures/configfiles',
              extensions: { // ignored
                '.js': './test/fixtures/configfiles/require-js',
                '.json': './test/fixtures/configfiles/require-json',
              },
            },
          },
        },
      });
      app.on('requireFail', function(moduleName, error) {
        logFailure.push({ moduleName: moduleName, error: error });
      });
      app.on('require', function(moduleName, module) {
        logRequire.push({ moduleName: moduleName, module: module });
      });
      app.prepare({}, function(env) {
        expect(env.configFiles).to.deep.equal({
          README: {
            text: path.resolve('./test/fixtures/configfiles/README.txt'),
            text_null: null,
            text_err: path.resolve('./test/fixtures/configfiles/README.txt'),
            markdown: path.resolve('./README.md'),
            markdown_badext: null,
            markdown_badext2: null,
          },
          index: {
            test: path.resolve('./test/fixtures/configfiles/index.json'),
          },
        });

        expect(logRequire.length).to.equal(2);
        expect(logRequire[0].moduleName)
          .to.equal('./test/fixtures/configfiles/require-txt');
        expect(logRequire[1].moduleName)
          .to.equal('./test/fixtures/configfiles/require-md');

        expect(logFailure.length).to.equal(1);
        expect(logFailure[0].moduleName)
          .to.equal('./test/fixtures/configfiles/require-non-exist');

        expect(require(env.configFiles.README.markdown))
          .to.equal('Load README.md by require-md');
        expect(require(env.configFiles.README.text)).to
          .to.equal('Load README.txt by require-txt');
        expect(require(env.configFiles.index.test))
          .to.deep.equal({ aaa: 'AAA' });
        done();
      });
    });
  });

});

require('./lib/build_config_name');
require('./lib/file_search');
require('./lib/parse_options');
require('./lib/silent_require');
require('./lib/register_loader');
require('./lib/get_node_flags');
require('./lib/change_env_paths');
