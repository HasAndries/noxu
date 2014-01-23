Noxu Commander
==================
##Setup
###Once off
`npm install -g grunt-cli supervisor`

###Regular
`npm install`

##Running
###Development Webserver
`npm start` or `node app`

###Build
`grunt` or `grunt build`

###Deploy to Pi
`grunt andries`

##Customizing
###Deploy target
Add another object under scp with a unique target name and details e.g.
```
andries: {
  options: {
    host: '10.0.0.44',
    username: 'pi',
    password: 'Password'
  },
  files: [
    { cwd: 'build', src: '**', dest: '/home/pi/noxu_commander/' }
  ]
}
```