module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    copy: {
      admin: {
        files: [
          {expand: true, src: ['app.js', 'config.js', 'config.json', 'package.json',
            'admin/**', 'run-admin', 'debug-admin'], dest: 'build/'}
        ]
      },
      network: {
        files: [
          {expand: true, src: ['network.js', 'config.js', 'config.json', 'package.json',
            'network/**', 'rf24/**', 'run-network', 'debug-network',
            'service/**'], dest: 'build/'}
        ]
      }
    },
    clean:{
      build: ['build/']
    },
    shell: {
      spi: {
        options: { stdout: true },
        command: 'npm install spi rpi-gpio'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('spi', ['shell:spi']);

  grunt.registerTask('build', ['clean:build','copy:admin', 'copy:network']);
  grunt.registerTask('build-admin', ['clean:build','copy:admin']);
  grunt.registerTask('build-network', ['clean:build', 'copy:network']);

  grunt.registerTask('default', ['build']);
};