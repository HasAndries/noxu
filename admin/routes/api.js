var api = {};
//---------- nodes ----------
api.nodes = function(req, res){
  
};
//---------- configure ----------
api.configure = function(req, res){

};

//========== config ==========
exports.attach = function(app){
  app.get('/api/nodes', api.nodes);
};
