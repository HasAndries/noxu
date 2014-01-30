function Api(){
  var api = this;
  var config = require('../../config')();
  var network = require('../../network/commandNetwork')(config);
  //---------- index ----------
  api.index = function(req, res){
    res.end('api');
  };
  //---------- nodes ----------
  api.nodes = function(req, res){
    res.end();
  };
  //---------- configure ----------
  api.configure = function(req, res){
    network.configure(req.body);
    res.end();
  };
  //---------- broadcast ----------
  api.broadcast = function(req, res){
    network.broadcast(req.body.instruction, req.body.data);
    res.end();
  };
  //---------- command ----------
  api.command = function(req, res){
    network.command(req.body.address, req.body.instruction, req.body.data);
    res.end();
  };
}
//========== config ==========
module.exports = function(app){
  var api = new Api();
  app.get('/api', api.index);
  app.get('/api/nodes', api.nodes);
  app.post('/api/configure', api.configure);
  app.post('/api/broadcast', api.broadcast);
  app.post('/api/command', api.command);
};
