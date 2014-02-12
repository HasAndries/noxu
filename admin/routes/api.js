var config = require('../../config')();

function Api(app, network){
  var _this = this;
  this.network = network;
  app.get('/api', function(req, res){
    res.end('api');
  });
  app.get('/api/nodes', function(req, res){
    res.end();
  });
  app.post('/api/configure', function(req, res){
    _this.network.configure(req.body);
    res.end();
  });
  app.post('/api/broadcast', function(req, res){
    _this.network.send(null, req.body.instruction, req.body.data);
    res.end()
  });
}
//========== config ==========
module.exports = Api;