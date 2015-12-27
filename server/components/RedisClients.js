var redis = require('redis');
var ServerConfig = require('../config/ServerConfig.json');
var NONoChatLogRedisServer= redis.createClient(
	ServerConfig.ChatLogRedisServer.PORT,
	ServerConfig.ChatLogRedisServer.IP,
	ServerConfig.ChatLogRedisServer.OPTIONS);

NONoChatLogRedisServer.on('error',function(err){
	console.log("redis error");
});
NONoChatLogRedisServer.on('connect',function(){
	console.log("redis connected");
});
var NONoClientInfoRedisServer = redis.createClient(
	ServerConfig.ClientInfoRedisServer.PORT,
	ServerConfig.ClientInfoRedisServer.IP,
	ServerConfig.ClientInfoRedisServer.OPTIONS);
NONoClientInfoRedisServer.on('error',function(err){
	console.log("redis error");
});
NONoClientInfoRedisServer.on('connect',function(){
	console.log("redis connected");
});
module.exports.getRedisClients = function(){
	return {
		NONoChatLogRedisServer:NONoChatLogRedisServer,
		NONoClientInfoRedisServer:NONoClientInfoRedisServer
	};
};