/**
*we save IMID and corresponding ip in NONoClientInfoRedisServer
*|-----|----|------|--------|
*|IMID|ip   |port  |state   |
*|12  |127  |9191  |1       |
*|-----|----|------|--------|
*Aha,this is an sql-like table
*But when using KVDB like redis,we shoule convert fields(ip/port/state) to json,and save this json as value
*
*state{
*	ONLINE:1,
*	OFFLINE:0
*}
*/
/**
*This file is a Http-POST Helper
*Including these features:
*one:tell server our client is online
*    every new connection or re-connection will need this step
*    then we build an heart timer to monitor this client
*two:
*/
var http = require('http');
var url = require('url');
var query = require('querystring');
var child_process = require('child_process');
var ServerConfig = require('../config/ServerConfig.json');
console.log(__dirname);
var childRedisProcess  = child_process.fork(__dirname+'/../NONoRedis.js', [], {encoding:"utf8"});
var server = http.createServer(function(request,response){
	//response.write(200, {"Content-Type":"text/json"});
	if(request.method == "POST"){
		var postData='';
		request.addListener("data",function(postChunk){
			postData += postChunk;
		});
		request.addListener("end",function(){
			/**
			*The post helper includes these features:
			*feature1:servered for connect,params:
			*{
			*	cmd:"LogOn",
			*	sender_id:"111"
			*}
			*feature2:the message push service:params:
			*{
			*	cmd:"Push"
			*}
			*/

			var params = JSON.parse(postData);
			console.log("get post datas:");
			console.log(postData);
			console.log("get post params:");
			console.log(params);
			childRedisProcess.send(params);
		});
	}
});
server.listen(ServerConfig.HTTPPORT);