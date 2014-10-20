var _ = require('underscore'),
    factory = require('../lib/config'),
    merge = require('deepmerge'),
    yaml = require('js-yaml');

describe("config", function() {

  var config, configClass, envMock, files, fsMock, sampleConfig;
  beforeEach(function() {

    files = {};

    envMock = {
      HOME: '/home'
    };

    fsMock = {
      existsSync: function(path) {
        return !!files[path];
      },
      readFileSync: function(path) {
        return files[path];
      }
    };

    sampleConfig = {
      publish: false,
      servers: {
        localhost: {
          apiUrl: 'http://localhost',
          apiKeyId: 'foo',
          apiKeySecret: 'bar'
        },
        'example.com': {
          apiUrl: 'http://example.com',
          apiKeyId: 'baz',
          apiKeySecret: 'qux',
          projectApiId: 'bar'
        }
      },
      server: 'localhost',
      project: {
        apiId: 'foo',
        version: '1.0.0',
        category: 'cat',
        tags: [ 'yee', 'haw' ],
        tickets: [ '100', '200' ]
      },
      workspace: '/tmp',
      payload: {
        cache: true,
        print: true,
        save: true
      }
    };

    configClass = factory(envMock, fsMock);
    config = new configClass();
  });

  function configData() {
    return _.pick(config, 'payload', 'project', 'publish', 'server', 'servers', 'testRunUid', 'workspace');
  }

  it("should accept options at construction", function() {
    var configWithUid = _.extend(sampleConfig, { testRunUid: 'yooayedee' });
    config = new configClass(configWithUid);
    expect(configData()).toEqual(configWithUid);
  });

  describe("load", function() {

    it("should have the correct defaults", function() {
      config.load();
      expect(configData()).toEqual({
        publish: true,
        project: {},
        payload: {}
      });
    });

    it("should load custom configuration options", function() {
      var configWithUid = _.extend(sampleConfig, { testRunUid: 'yooayedee' });
      config.load(configWithUid);
      expect(configData()).toEqual(configWithUid);
    });

    it("should load the home configuration file", function() {
      files['/home/.rox/config.yml'] = yaml.safeDump(sampleConfig);
      config.load();
      expect(configData()).toEqual(sampleConfig);
    });

    it("should load the project configuration file", function() {
      files['rox.yml'] = yaml.safeDump(sampleConfig);
      config.load();
      expect(configData()).toEqual(sampleConfig);
    });

    it("should load the project configuration file from a custom location", function() {
      files['custom.yml'] = yaml.safeDump(sampleConfig);
      _.extend(envMock, { ROX_CONFIG: 'custom.yml' });
      config.load();
      expect(configData()).toEqual(sampleConfig);
    });

    it("should not load a project configuration file that doesn't exist", function() {
      files['/home/.rox/config.yml'] = yaml.safeDump({ workspace: '/tmp' });
      _.extend(envMock, { ROX_CONFIG: 'foo' });
      config.load();
      expect(configData()).toEqual({
        publish: true,
        project: {},
        payload: {},
        workspace: '/tmp'
      });
    });

    it("should load configuration through environment variables", function() {
      _.extend(envMock, {
        ROX_PUBLISH: '0',
        ROX_SERVER: 'example.com',
        ROX_WORKSPACE: '/tmp',
        ROX_CACHE_PAYLOAD: '1',
        ROX_PRINT_PAYLOAD: '1',
        ROX_SAVE_PAYLOAD: '1',
        ROX_TEST_RUN_UID: 'yooayedee'
      });
      config.load();
      expect(configData()).toEqual({
        publish: false,
        project: {},
        server: 'example.com',
        workspace: '/tmp',
        payload: {
          cache: true,
          print: true,
          save: true
        },
        testRunUid: 'yooayedee'
      });
    });

    it("should override home configuration file options with project configuration file options", function() {

      var overrides = {
        publish: false,
        servers: {
          localhost: {
            projectApiId: 'foo'
          },
          'example.com': {
            apiUrl: 'http://example.com/rox',
            apiKeySecret: 'quxx'
          }
        },
        server: 'example.com',
        project: {
          apiId: 'foo',
          version: '1.0.1',
          category: 'dog',
          tags: [ 'yay' ],
          tickets: [ '300', '400' ]
        },
        workspace: '/home/tmp',
        payload: {
          cache: false
        }
      };

      files['/home/.rox/config.yml'] = yaml.safeDump(sampleConfig);
      files['rox.yml'] = yaml.safeDump(overrides);

      config.load();
      expect(configData()).toEqual(merge(sampleConfig, overrides));
    });

    it("should override configuration file options with custom configuration options", function() {

      var overrides = {
        publish: false,
        servers: {
          localhost: {
            projectApiId: 'foo'
          },
          'example.com': {
            apiUrl: 'http://example.com/rox',
            apiKeySecret: 'quxx'
          }
        },
        server: 'example.com',
        project: {
          apiId: 'foo',
          version: '1.0.1',
          category: 'dog',
          tags: [ 'yay' ],
          tickets: [ '300', '400' ]
        },
        workspace: '/home/tmp',
        payload: {
          cache: false
        },
        testRunUid: 'yooayedee'
      };

      files['/home/.rox/config.yml'] = yaml.safeDump(sampleConfig);
      config.load(overrides);

      expect(configData()).toEqual(merge(sampleConfig, overrides));
    });

    it("should override custom configuration options with environment variable options", function() {

      _.extend(envMock, {
        ROX_PUBLISH: '0',
        ROX_SERVER: 'example.com',
        ROX_WORKSPACE: '/home/tmp',
        ROX_CACHE_PAYLOAD: '0',
        ROX_PRINT_PAYLOAD: '0',
        ROX_SAVE_PAYLOAD: '0',
        ROX_TEST_RUN_UID: 'yooeyedee'
      });
      config.load(_.extend(sampleConfig, { testRunUid: 'yooayedee' }));

      expect(configData()).toEqual(merge(sampleConfig, {
        publish: false,
        server: 'example.com',
        workspace: '/home/tmp',
        payload: {
          cache: false,
          print: false,
          save: false
        },
        testRunUid: 'yooeyedee'
      }));
    });

    it("should apply all overrides", function() {

      files['/home/.rox/config.yml'] = yaml.safeDump(sampleConfig);

      files['rox.yml'] = yaml.safeDump({
        publish: false,
        servers: {
          localhost: {
            apiUrl: 'http://localhost:3000'
          }
        },
        project: {
          apiId: 'top'
        },
        workspace: '/home/tmp'
      });

      var customConfig = {
        servers: {
          localhost: {
            apiUrl: 'http://localhost:3001'
          }
        },
        project: {
          apiId: 'down'
        },
        workspace: '/home/playground',
        testRunUid: 'yooeyedee'
      };

      _.extend(envMock, {
        ROX_WORKSPACE: '/playground',
        ROX_TEST_RUN_UID: 'yooayedee'
      });

      config.load(customConfig);
      expect(configData()).toEqual(merge(sampleConfig, {
        publish: false,
        servers: {
          localhost: {
            apiUrl: 'http://localhost:3001'
          }
        },
        project: {
          apiId: 'down'
        },
        workspace: '/playground',
        testRunUid: 'yooayedee'
      }));
    });

    it("should parse boolean environment variables", function() {

      var vars = [ 'ROX_PUBLISH', 'ROX_CACHE_PAYLOAD', 'ROX_PRINT_PAYLOAD', 'ROX_SAVE_PAYLOAD' ],
          booleanValues = [
            {
              expectedValue: true,
              strings: [ '1', 'y', 'yes', 't', 'true' ]
            },
            {
              expectedValue: false,
              strings: [ '0', 'n', 'no', 'f', 'false', 'anything' ]
            }
          ];

      _.each(booleanValues, function(booleanValue) {
        _.each(booleanValue.strings, function(bool) {

          _.extend(envMock, _.inject(vars, function(memo, varName) {
            memo[varName] = bool;
            return memo;
          }, {}));

          config.load();
          expect(configData()).toEqual({
            publish: booleanValue.expectedValue,
            project: {},
            payload: {
              cache: booleanValue.expectedValue,
              print: booleanValue.expectedValue,
              save: booleanValue.expectedValue
            }
          });
        });
      });
    });

    it("should clear the configuration if reloaded", function() {

      files['/home/.rox/config.yml'] = yaml.safeDump(sampleConfig);
      config.load();
      expect(configData()).toEqual(sampleConfig);

      files = { 'rox.yml': yaml.safeDump({ publish: false }) };
      config.load();
      expect(configData()).toEqual({
        publish: false,
        project: {},
        payload: {}
      });

      files = {};
      config.load({
        project: {
          apiId: 'foo'
        }
      });
      expect(configData()).toEqual({
        publish: true,
        project: {
          apiId: 'foo'
        },
        payload: {}
      });

      _.extend(envMock, { ROX_WORKSPACE: '/tmp' });
      config.load();
      expect(configData()).toEqual({
        publish: true,
        project: {},
        payload: {},
        workspace: '/tmp'
      });
    });

    it("should override the category but merge tags and tickets", function() {

      files['/home/.rox/config.yml'] = yaml.safeDump({ project: { category: 'cat', tags: [ 'yee', 'haw' ], tickets: [ '100' ] } });

      files['rox.yml'] = yaml.safeDump({ project: { category: 'dog', tags: [ 'yee' ], tickets: [ '200' ] } });

      config.load({ project: { category: 'camel', tags: [ 'yee', 'haw', 'yay' ], tickets: [ '100', '300' ] } });

      expect(configData()).toEqual({
        publish: true,
        project: {
          category: 'camel',
          tags: [ 'yee', 'haw', 'yay' ],
          tickets: [ '100', '200', '300' ]
        },
        payload: {}
      });
    });

    it("should not load the test run UID from configuration files", function() {
      files['/home/.rox/config.yml'] = yaml.safeDump(_.extend({}, sampleConfig, { testRunUid: 'yooayedee' }));
      files['rox.yml'] = yaml.safeDump({ testRunUid: 'yooeyedee' });
      config.load();
      expect(configData()).toEqual(sampleConfig);
    });
  });

  describe("getServerOptions", function() {

    it("should return the options of the selected server", function() {

      var serverOptions = {
        apiUrl: 'http://example.com',
        apiKeyId: 'foo',
        apiKeySecret: 'bar'
      };

      config.load({ servers: { 'example.com': serverOptions }, server: 'example.com' });
      expect(config.getServerOptions()).toEqual(serverOptions);
    });

    it("should return no options if the configuration is empty", function() {
      config.load();
      expect(config.getServerOptions()).toEqual({});
    });

    it("should return no options if no servers are defined", function() {
      config.load({ server: 'localhost' });
      expect(config.getServerOptions()).toEqual({});
    });

    it("should return no options if the selected server is not defined", function() {
      config.load({ servers: { 'example.com': { apiUrl: 'http://example.com' } }, server: 'localhost' });
      expect(config.getServerOptions()).toEqual({});
    });
  });

  describe("getProjectOptions", function() {

    var projectOptions;
    beforeEach(function() {
      projectOptions = {
        apiId: 'foo',
        version: '1.0.0',
        category: 'cat',
        tags: [ 'yee', 'haw' ],
        tickets: [ '100', '200', '300' ]
      };
    });

    it("should return the project options", function() {
      config.load({ project: projectOptions });
      expect(config.getProjectOptions()).toEqual(projectOptions);
    });

    it("should override the project API ID with the one of the selected server", function() {
      config.load({ project: projectOptions, servers: { localhost: { projectApiId: 'bar' } }, server: 'localhost' });
      expect(config.getProjectOptions()).toEqual(_.extend(projectOptions, { apiId: 'bar' }));
    });

    it("should return no options if the configuration is empty", function() {
      config.load();
      expect(config.getProjectOptions()).toEqual({});
    });
  });

  describe("validate", function() {

    var errors;
    beforeEach(function() {
      errors = [];
    });

    function validate(customConfig) {
      config.load(customConfig || sampleConfig);
      config.validate(errors);
    }

    it("should add no errors if the configuration is valid", function() {
      validate();
      expect(errors).toEqual([]);
    });

    it("should add an error if the project configuration file set by the ROX_CONFIG environment variable doesn't exist", function() {
      _.extend(envMock, { ROX_CONFIG: 'foo' });
      validate();
      expect(errors).toEqual([ 'No project configuration file found at foo (set with $ROX_CONFIG environment variable)' ]);
    });

    it("should add an error if the project API ID is missing", function() {
      delete sampleConfig.project.apiId;
      validate();
      expect(errors).toEqual([ 'Project API ID is not set (set "project.apiId" in configuration file)' ]);
    });

    it("should add an error if the project version is missing", function() {
      delete sampleConfig.project.version;
      validate();
      expect(errors).toEqual([ 'Project version is not set (set "project.version" in configuration file)' ]);
    });

    it("should add errors if the project options are missing", function() {
      delete sampleConfig.project;
      validate();
      expect(errors).toEqual([
        'Project API ID is not set (set "project.apiId" in configuration file)',
        'Project version is not set (set "project.version" in configuration file)'
      ]);
    });

    it("should add errors if the project option is not an object", function() {
      validate(_.extend(sampleConfig, { project: false }));
      expect(errors).toEqual([
        'Project is not configured (set "project.apiId" and "project.version" in configuration file)'
      ]);
    });

    it("should add an error if no server is configured", function() {
      delete sampleConfig.servers;
      validate();
      expect(errors).toEqual([ 'No ROX Center server is configured (set "servers" in configuration file)' ]);
    });

    it("should add an error if the servers option is not an object", function() {
      validate(_.extend(sampleConfig, { servers: false }));
      expect(errors).toEqual([ 'No ROX Center server is configured (set "servers" in configuration file)' ]);
    });

    it("should add an error if a server is missing the API URL", function() {
      delete sampleConfig.servers.localhost.apiUrl;
      validate();
      expect(errors).toEqual([ 'No API URL is set for ROX Center server localhost (set "servers.localhost.apiUrl" in configuration file)' ]);
    });

    it("should add an error if a server is missing the API key ID", function() {
      delete sampleConfig.servers['example.com'].apiKeyId;
      validate();
      expect(errors).toEqual([ 'No API key ID is set for ROX Center server example.com (set "servers.example.com.apiKeyId" in configuration file)' ]);
    });

    it("should add an error if a server is missing the API key secret", function() {
      delete sampleConfig.servers.localhost.apiKeySecret;
      validate();
      expect(errors).toEqual([ 'No API key secret is set for ROX Center server localhost (set "servers.localhost.apiKeySecret" in configuration file)' ]);
    });

    it("should add errors if multiple servers are invalid", function() {
      delete sampleConfig.servers.localhost.apiUrl;
      delete sampleConfig.servers.localhost.apiKeyId;
      delete sampleConfig.servers['example.com'].apiKeySecret;
      validate();
      expect(errors).toEqual([
        'No API URL is set for ROX Center server localhost (set "servers.localhost.apiUrl" in configuration file)',
        'No API key ID is set for ROX Center server localhost (set "servers.localhost.apiKeyId" in configuration file)',
        'No API key secret is set for ROX Center server example.com (set "servers.example.com.apiKeySecret" in configuration file)'
      ]);
    });

    it("should add errors if the configuration is empty", function() {
      validate({});
      expect(errors).toEqual([
        'Project API ID is not set (set "project.apiId" in configuration file)',
        'Project version is not set (set "project.version" in configuration file)',
        'No ROX Center server is configured (set "servers" in configuration file)'
      ]);
    });
  });
});
