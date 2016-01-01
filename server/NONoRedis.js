
var child_process = require('child_process');
var RedisClients = require('./components/RedisClients.js');
var NONoChatLogRedisServer= RedisClients.getRedisClients().NONoChatLogRedisServer;
var NONoClientInfoRedisServer = RedisClients.getRedisClients().NONoClientInfoRedisServer;
var childHeartTimerProcess  = child_process.fork(
			'./HeartTimerSet.js'
			, [], {encoding:"utf8"}
			);

//use IPC to  communicate btw process
//message format
// {
// 	peer_ip:"xx.xx.xx.xx",
//	peer_port:1234,
// 	msg_timestamp:"",
// 	msg_payload:"some msgs.."
// }
//we use pub/sub model
/**
*
*
*/
process.on('message',function(message){
	switch(message.cmd){
		/*
		*	{
		*		cmd:"LogOn",
		*		sender_id:"1"
		*	}
		*/
		// case "LogOn":
		// NONoClientInfoRedisServer.get(message.sender_id,function(err,reply){
		// 	if( !reply){
		// 		NONoClientInfoRedisServer.set(message.sender_id,{
		// 			ip:"",
		// 			port:"",
		// 			state:1
		// 		});
		// 	}else{
		// 		console.log("get new client info:");
		// 		console.log(reply);
		// 		reply.state = 1;
		// 		NONoClientInfoRedisServer.set(message.sender_id,reply);
		// 	}
		// });
		// childHeartTimerProcess.send({cmd:"new_log_on",data:{
		// 	id:message.sender_id
		// }});
		// break;
		/**
		*	{
		*		cmd:"Push",
		*		receiver_id:11,
		*		payLoad:"the msg to push"
		*	}
		*/
		case "Push":
		console.log(message.receiver_id)
		NONoClientInfoRedisServer.get(Number(message.receiver_id),function(err,reply){
			if(err){
				console.log("error in NONoRedis.js!\n");
			}else{
				reply = JSON.parse(reply);
			var m = {
					msg_payload:{
						msg_type:1/*Push Service*/,
						payLoad:message.payLoad
					},
					peer_ip:reply.ip,
					peer_port:reply.port
				};
			console.log("push msg in redis list:");
			console.log(m);
			NONoChatLogRedisServer.publish("MSG_CHANNEL",JSON.stringify(m));
			}
		});
		break;
	}
	
});