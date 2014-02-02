module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      target: {
        files: [
          {expand: true, src: ['app.js', 'network.js', 'config.js', 'config.json', 'package.json',
            'admin/**', 'network/**', 'run-*', 'debug-*'], dest: 'build/'}
        ]
      }
    },
    shell: {
      install: {
        options: { stdout: true },
        command: 'npm install nrf'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('install', ['shell:install']);

  grunt.registerTask('build', ['copy']);
  grunt.registerTask('andries', ['build', 'scp:andries']);

  grunt.registerTask('default', ['build']);
};