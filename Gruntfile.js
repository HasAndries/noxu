module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      target: {
        files: [
          {expand: true, src: ['app.js', 'admin.js', 'network.js',
            'config.js', 'config.json', 'package.json', 'admin/**', 'network/**',
          'run-*'], dest: 'build/'}
        ]
      }
    },
    shell: {
      install: {
        options: { stdout: true },
        command: 'npm install nrf'
      }
    },
    scp: {
      andries: {
        options: {
          host: '10.0.0.236',
          username: 'pi',
          password: 'LogThis1'
        },
        files: [
          { cwd: 'build', src: '**', dest: '/home/pi/noxu_commander/' }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-scp');

  grunt.registerTask('install', ['shell:install']);
  grunt.registerTask('nrf', ['shell:nrf']);

  grunt.registerTask('build', ['copy']);
  grunt.registerTask('andries', ['build', 'scp:andries']);

  grunt.registerTask('default', ['build']);
};