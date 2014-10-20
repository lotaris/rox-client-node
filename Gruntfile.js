module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    jshint: {
      all: [
        'Gruntfile.js',
        'lib/**/*.js'
      ]
    },

    jasmine_node: {
      all: ['spec/']
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jasmine-node');

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'jasmine_node']);
};
