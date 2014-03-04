
function Api(app, network){
  this.network = network;

  app.get('/nodes', this.getNodes);
  app.post('/broadcast', this.broadcast);
  app.post('/send', this.send);
  app.post('/ping', this.ping);
}

//========== GENERIC ==========
Api.prototype.getNodes = function(req, res){
  var nodes = this.network.getNodes();
  res.write(JSON.stringify(nodes));
  res.end();
};

Api.prototype.broadcast = function(req, res){
  //todo sanitise message
  this.network.broadcast(req.body);
  res.end();
};

Api.prototype.send = function(req, res){
  //todo sanitise message
  this.network.send(req.body);
  res.end();
};
//========== OPERATIONS ==========
Api.prototype.ping = function(req, res){
  this.network.ping(req.body.id || null);
  res.end();
};

module.exports = Api;