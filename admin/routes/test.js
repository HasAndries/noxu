var layout = require('./layout');

exports.index = function(req, res){
  var renderObjects = layout.renderObjects;
  renderObjects.pageName = 'test';
  res.render('settings', renderObjects);
};
