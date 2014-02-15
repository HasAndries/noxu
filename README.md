Noxu Commander
==================
##Setup
###Once off
All:
`npm install`
`npm install -g grunt-cli supervisor`

Raspberry Pi:
`npm install spi rpi-gpio`
```
git clone git://github.com/quick2wire/quick2wire-gpio-admin.git
cd quick2wire-gpio-admin
make
sudo make install
sudo adduser $USER gpio
```

##Running
###Run Admin application
`./run-admin` or `./debug-admin`

###Run Network server
`./run-network` or `./debug-network`

###Build
All:     `grunt` or `grunt build`
Admin:   `grunt build-admin`
Network: `grunt build-admin`

###Deploy to Pi
Andries' device: `andries`

##Customizing
###Deploy target(replace [NEW] with new config name)
On Windows, add a system/user variable:
`NODE_ENV=[NEW]`
On Linux and Rasperry Pi, add an environment variable to e.g. ~/.bashrc:
`export NODE_ENV=[NEW]`
In config.json, add a new config section [NEW], and add config settings wanted.
add a new file(without extension) to the project called [NEW], with content:
```
grunt build-network
scp -r build/** pi@10.0.0.236:/home/pi/noxu_commander
```
Change the scp destination to own Raspberry Pi, and do:
`chmod +x [NEW]`
