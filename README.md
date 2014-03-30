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
###nginx install from source
```
wget http://nginx.org/download/nginx-1.5.12.tar.gz
tar -xvzf nginx-1.5.12.tar.gz
cd nginx-1.5.12
./configure --sbin-path=/usr/local/sbin --with-http_ssl_module
make
sudo make install
```

###nginx
```
sudo mkdir /usr/local/nginx/sites-available
sudo mkdir /usr/local/nginx/sites-enabled
```
####config file
`sudo cp setup/nginx/nginx.conf /usr/local/nginx/conf/`

####default site
`sudo cp setup/nginx/default /usr/local/nginx/sites-available/`
`sudo ln -s /usr/local/nginx/sites-available/default /usr/local/nginx/sites-enabled/`

####noxu_network site
`sudo cp setup/nginx/noxu_network /usr/local/nginx/sites-available/`
`sudo ln -s /usr/local/nginx/sites-available/noxu_network /usr/local/nginx/sites-enabled/`

###init.d
`sudo cp setup/init.d/nginx /etc/init.d`
`sudo cp setup/init.d/noxu /etc/init.d`

####usage
nginx start - `/etc/init.d/nginx start`
nginx stop - `/etc/init.d/nginx stop`

noxu start - `/etc/init.d/noxu start`
noxu stop - `/etc/init.d/noxu stop`

###mongodb
run contents of `setup/mongodb/install`
config file - `/etc/mongodb.conf`
command line - `mongo`
start - `/etc/init.d/mogod start`
stop - `/etc/init.d/mogod stop`