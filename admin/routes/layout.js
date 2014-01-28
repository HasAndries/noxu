exports.renderObjects = {
  menuItems: [
    {name: 'home', link: '/'},
    {name: 'settings', link: '/settings'},
    {name: 'test', link: '/test'}
  ]
};

exports.css = function(req, res){
  var less = require('less');
  var fs = require('fs');
  var path = require('path');
  less.render(fs.readFileSync(path.join(__dirname, '../public/styles/main.less'), 'utf8'), function(err, data){
    if (err) throw err;
    res.set('Content-Type', 'text/css');
    res.send(data);
  });
};