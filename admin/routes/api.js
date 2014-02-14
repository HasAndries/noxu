var config = require('../../config');

function Api(app, network){
  var _this = this;
  this.network = network;
  app.get('/api', function(req, res){
    res.end('api');
  });
  app.get('/api/nodes', function(req, res){
    var nodes = _this.network.getNodes();
    res.write(JSON.stringify(nodes));
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
  app.post('/api/send', function(req, res){
    _this.network.send(req.body.id, req.body.instruction, req.body.data);
    res.end();
  });
  app.post('/api/ping', function(req, res){
    _this.network.ping(req.body.id);
    res.end();
  });
}
//========== config ==========
module.exports = Api;