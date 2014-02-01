var CommandNetwork = require('../../network/commandNetwork');
var config = require('../../config')();

function Api(app){
  var _this = this;
  var network = new CommandNetwork();
  app.get('/api', function(req, res){
    res.end('api');
  });
  app.get('/api/nodes', function(req, res){
    res.end();
  });
  app.post('/api/configure', function(req, res){
    network.configure(req.body);
    res.end();
  });
  app.post('/api/broadcast', function(req, res){
    network.broadcast(req.body.instruction, req.body.data);
    res.end()
  });
  app.post('/api/command', function(req, res){
    network.command(req.body.address, req.body.instruction, req.body.data);
    res.end();
  });
}
//========== config ==========
module.exports = Api;