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

###setup nginx
```
sudo mkdir /usr/local/nginx/sites-available
sudo mkdir /usr/local/nginx/sites-enabled
```
####config file
`sudo pico /usr/local/nginx/conf/nginx.conf`
```
user www-data;
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;

    sendfile        on;

    keepalive_timeout  65;

    gzip  on;

    include /usr/local/nginx/sites-enabled/*;

}
```

####default site
`sudo pico /usr/local/nginx/sites-available/default`
```
server {
    listen       80;
    server_name  localhost;

    location / {
        root   html;
        index  index.html index.htm;
    }
    # redirect server error pages to the static page /50x.html
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   html;
    }
}
```
`sudo ln -s /usr/local/nginx/sites-available/default /usr/local/nginx/sites-enabled/default`

####noxu_network site
`sudo pico /usr/local/nginx/sites-available/noxu_network`
```
upstream backend {
    server 127.0.0.1:9440;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name network.hasandries.com;
    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://backend/;
        proxy_redirect off;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        access_log /var/log/nginx/noxu_network.log;
        error_log  /var/log/nginx/noxu_network.log;
    }
}
```
`sudo ln -s /usr/local/nginx/sites-available/noxu_network /usr/local/nginx/sites-enabled/noxu_network`

###nginx block
upstream backend {
    server localhost:9440;
}
server {
    listen 80;

    root /var/www/noxu_network;
    index index.html index.htm;

    access_log /var/log/nginx/noxu_network.log;
    error_log  /var/log/nginx/noxu_network.log;

    server_name hasandries.com;

    client_max_body_size 20M;

    location /socket {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_http_version 1.1;
        proxy_set_header   X-Real-IP        $remote_addr;
        proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
        proxy_set_header   X-NginX-Proxy    true;
        proxy_set_header   Host             $http_host;
        proxy_set_header   Upgrade          $http_upgrade;
        proxy_redirect     off;
        proxy_pass         http://backend;
    }
}

upstream backend {
    server 127.0.0.1:9440;
}

map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 80;
    server_name hasandries.com;
    location / {
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-NginX-Proxy true;

        proxy_pass http://backend/;
        proxy_redirect off;

        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        access_log /var/log/nginx/noxu_network.log;
        error_log  /var/log/nginx/noxu_network.log;
    }
}

###init.d
Copy `service/noxu` to `/etc/init.d` and use as normal service:
`/etc/init.d/noxu start` & `/etc/init.d/noxu stop`
