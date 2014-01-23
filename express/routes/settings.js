var layout = require('./layout');

exports.index = function(req, res){
  var renderObjects = layout.renderObjects;
  renderObjects.pageName = 'settings';
  res.render('settings', renderObjects);
};
