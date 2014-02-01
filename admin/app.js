var express = require('express');
var swig = require('swig');
var path = require('path');

var Api = require('./routes/api');
var app = express();

module.exports = {
  build: function (config) {
    // settings
    var env = app.get('env');
    app.set('port', process.env.PORT || 3000);
    if (env == 'development') {
      app.use(express.errorHandler());
    }
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
//    app.use(require('less-middleware')({ src: path.join(__dirname, 'public', 'styles') })); //less
    app.use(express.static(path.join(__dirname, 'public'))); //public

    //views
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'html');
    app.engine('html', swig.renderFile);
    swig.setDefaults({
      varControls: ['{[', ']}'],
      tagControls: ['{=', '=}']
    });

    //routes
    app.get('/', require('./routes/home').index);
    app.get('/test', require('./routes/test').index);
    app.get('/settings', require('./routes/settings').index);
    var api = new Api(app);
    //special routes
    var layout = require('./routes/layout');
    app.get('/main.css', layout.css);
    return app;
  }
}