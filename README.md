Noxu Commander
==================
##Setup
###Once off
All:
`npm install`
`npm install -g grunt-cli supervisor`
RF24
`cd rf24` & `grunt rebuild`

##Running
###Run Web application
`./run-web` or `./debug-web`

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
scp -r build/** pi@192.168.1.3:/var/www/noxu_network
```
Change the scp destination to own Raspberry Pi, and do:
`chmod +x [NEW]`

##Services
###nginx block
location /noxu_network/ {
    proxy_pass http://localhost:9440/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}

###init.d
Copy `service/noxu` to `/etc/init.d` and use as normal service:
`/etc/init.d/noxu start` & `/etc/init.d/noxu stop`
