module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      target: {
        files: [
          {expand: true, src: ['app.js', 'config.js', 'config.json', 'package.json', 'express/**'], dest: 'build/'}
        ]
      }
    },
    shell: {
      arm: {
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

  grunt.registerTask('build', ['copy']);
  grunt.registerTask('arm', ['shell:arm']);
  grunt.registerTask('andries', ['build', 'scp:andries']);

  grunt.registerTask('default', ['build']);
};