function Pages(app){
  var _this = this;
  //renderObjects gets passed to the render engine as available objects
  _this.renderObjects = {
    menuItems: [
      {name: 'home', link: '/'},
      {name: 'settings', link: '/settings'},
      {name: 'test', link: '/test'}
    ]
  };
  //---------- /main.css ----------
  app.get('/main.css', function(req, res){
    var less = require('less');
    var fs = require('fs');
    var path = require('path');
    less.render(fs.readFileSync(path.join(__dirname, '../public/styles/main.less'), 'utf8'), function(err, data){
      if (err) throw err;
      res.set('Content-Type', 'text/css');
      res.send(data);
    });
  });
  //---------- / ----------
  app.get('/', function(req, res){
    var renderObjects = _this.renderObjects;
    renderObjects.pageName = 'home';
    res.render('home', renderObjects);
  });
  //---------- /settings ----------
  app.get('/settings', function(req, res){
    var renderObjects = _this.renderObjects;
    renderObjects.pageName = 'settings';
    res.render('settings', renderObjects);
  });
  //---------- /test ----------
  app.get('/test', function(req, res){
    var renderObjects = _this.renderObjects;
    renderObjects.pageName = 'test';
    res.render('test', renderObjects);
  });
}
module.exports = Pages;