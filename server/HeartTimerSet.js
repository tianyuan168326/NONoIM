/**
 * every message send to client has its own type
 * 1:normal message
 * 2:ack message
 */
var redis = require('redis');
var HashMap = require('hashmap');
var async = require('async');
var NONoProtocol = new require('./components/NONoProtocol.js')();
var EventEmitter = require('events').EventEmitter;
var eventController = new EventEmitter();
var ServerConfig = require('./config/ServerConfig.json');
var RedisClients = require('./components/RedisClients.js');
var NONoLog = require('./NONoIMHelper/NONoLog.js');
var child_process = require('child_process');
var NONoChatLogRedisServer= require('./components/NONoChatLogRedisServer.js');
var TcpPacketParser = require('./components/TcpPacketParser.js');
const STATE_DEAD = 0;
const STATE_MID = 1;
const STATE_ALIVE = 2;
/**
*The clientMap contains every connected client
*{
*	Key:client id,
*	Value:flag
* }
*The flag shows if the client is still online(UDP connect alive),we have a timer check it every 1 minute.
*flag 1:alive,flag 0:dead
*/
var clientMap = {};
/**
//for http
process.on('messsage',function(message,handle){
	switch(messsage.cmd){
		case "new_log_on":
		clientMap[messsage.data.id] = DEAD;
		break;
	}
});
*/
/**when the sender client didn't get the ack after sending for sometime,
we let the Client to go with it**/
//var clientSocketArray = [];
var clientSocketMap = new HashMap();
var clientStateMap = new HashMap();
var clientTcpParserMap = new HashMap();
var messageCacheMapRecivingFromClient = NONoChatLogRedisServer.getRedisHandle();
var clientMessageListCacheMapWaitingForRecive = NONoChatLogRedisServer.getRedisHandle();
var net = require('net');
var server = net.createServer(function(client) {
	NONoLog.log('debug','new client connected!');
	var tcpPacketParser = new TcpPacketParser.TcpPacketParser();
	//clientSocketArray.push(client);
	client.setEncoding('utf8');
	client.setTimeout(0);
	client.setNoDelay(true);
	client.on('data',function(dataString){
		tcpPacketParser.grabPacket(dataString.toString());
		var tcpPacket=null;
		while(tcpPacket = tcpPacketParser.parsePacket()){
			try{
				data = JSON.parse(tcpPacket);
			}catch(e){
			}
		switch(data.cmd){
			/**
			*	{
			*		cmd:"log_on",
			*		id:1
			*	}
			*/
			case 'log_on':
			id = Number(data.id);
			clientSocketMap.set(id,client);
			clientStateMap.set(id,STATE_ALIVE);
			break;
			/**
			*for heart beat
			*	{
			*		cmd:"heart",
			*		id:1
			*	}
			*/
			case  "heart":
			id = Number(data.id);
			clientStateMap.set(id,STATE_ALIVE);
			break;
			/**
			*for IM(TCP Channel)
			*	{
			*		cmd:"send_msg",
			*		id:2
			*		receiver_id:1
			*		msg:{
			*			msg_type:1,
			*			msg_payload:"the message payload",
			*			msg_uid:"id-timestamp"
			*		}
			*	}
			*	note:every uid in our server should be no-repeating,and should be 
			*	made by client,now it's "client's id"+"-"+"timestamp(unix)"
			*	we should always send message before get ack from client
			*	we just send one-time ack to sender client
			*	{
			*		cmd:'ack_got_message',
			*		msg_uid:'xxxx-xxxx'
			*	}
			*/
			case 'send_msg':
			id = Number(data.id);
			receiver_id = Number(data.receiver_id);
			//feed back to sender client
			var gotMessageACK = NONoProtocol.get("ack_got_message");
			gotMessageACK.msg_uid = data.msg.msg_uid;
			var gotMessageACKString = JSON.stringify(gotMessageACK);
			client.write(TcpPacketParser.tcpSenderPacketWrapper(gotMessageACKString) );
			//process message
			clientStateMap.set(id,STATE_ALIVE);
			var clientMessageListCacheWaitingForRecive = {};
			Promise.resolve()
			.then(function(){
				return new Promise(function(resolve,reject){
					messageCacheMapRecivingFromClient.set(data.msg.msg_uid,JSON.stringify(data),function(err){
					if(err){
						reject("save message error");
					}
					resolve();
				});
				});
			})
			.then(function(){
				return new Promise(function(resolve,reject){
					clientMessageListCacheMapWaitingForRecive.get(receiver_id
					,function(err,clientMessageListCacheWaitingForRecive){
						if(err){
							reject("get message uid list error");
						}
						resolve(clientMessageListCacheWaitingForRecive);
					});	
				});	
			})
			.then(function(clientMessageListCacheWaitingForRecive){
				return new Promise(function(resolve){
					if(!clientMessageListCacheWaitingForRecive){
						clientMessageListCacheWaitingForRecive = [];
					}else{
						clientMessageListCacheWaitingForRecive= JSON.parse(clientMessageListCacheWaitingForRecive);
					}
					if(!(clientMessageListCacheWaitingForRecive instanceof Array)){
						clientMessageListCacheWaitingForRecive = [];
					}
					resolve(clientMessageListCacheWaitingForRecive);
				});
					
			})
			.then(function(clientMessageListCacheWaitingForRecive){
				return new Promise(function(resolve,reject){
					clientMessageListCacheWaitingForRecive.push(data.msg.msg_uid);
					clientMessageListCacheMapWaitingForRecive.set(receiver_id,
						JSON.stringify(clientMessageListCacheWaitingForRecive),function(err){
							if(err){
								reject("save new ListCache error");
							}
							resolve();
						});
				});
				
			})
			.then(function(){
				return new Promise(function (resolve,reject){
					var clientState = clientStateMap.get(receiver_id);
							if(clientSocketMap.get(receiver_id)&&(clientState===STATE_MID||clientState ===STATE_ALIVE)){
							resolve(receiver_id);
							}
						});
			}
			)
			.then(function(receiver_id){
				/*
			*	{
			*		cmd:"send_msg",
			*		id:2,
			*		receiver_id:1,
			*		msg:{
			*			msg_type:1,
			*			msg_payload:"the message payload",
			*			msg_uid:"id-timestamp"
			*		}
			*	}
			*	*/
			return new Promise(function(resolve,reject){
				clientMessageListCacheMapWaitingForRecive.get(receiver_id,function(err,clientMessageListCacheWaitingForRecive){
					if(err){
						reject('get listCache error!');
					}
					resolve(clientMessageListCacheWaitingForRecive);
				});

			});
			})
			.then(function(clientMessageListCacheWaitingForRecive){
				return new Promise(function(resolve,reject){
					if( !clientMessageListCacheWaitingForRecive){
						reject('list cache should not be null theoretically!');
					}else{
					clientMessageListCacheWaitingForRecive = JSON.parse(clientMessageListCacheWaitingForRecive);
					}
					client = clientSocketMap.get(receiver_id);
					for(var index  = 0;index<clientMessageListCacheWaitingForRecive.length;index++){
					messageCacheMapRecivingFromClient.get(
							clientMessageListCacheWaitingForRecive[index],function(err,message){
								if(err){
									reject('fetch message by uid from redis error!');
								}
								sendMessage(message,
									client);
							});
					}
				
				})
			});
			function sendMessage(message,client){
				var message = JSON.parse(message);
				var messagePayLoad = NONoProtocol.get('new_message');
				messagePayLoad.msg_type = message.msg.msg_type;
				messagePayLoad.msg_payload = message.msg.msg_payload;
				messagePayLoad.msg_uid = message.msg.msg_uid;
				messagePayLoad.msg_sender_id = message.id;
				var messagePayLoadString = JSON.stringify(messagePayLoad);
				client.write(TcpPacketParser.tcpSenderPacketWrapper(messagePayLoadString));
			}
			break;
			/*the client ack that he had received the message
			*{
			*	cmd:"ack_message",
			*	id:1,
			*	msg_sender_id:2,
			*	msg_uid:'xxx-xxxxx'
			*	}
			 */
			case 'ack_message':
			NONoLog.log('debug',"get ack");
			id = Number(data.id);
			//messageCacheMapRecivingFromClient.remove(data.msg_uid);
			clientMessageListCacheMapWaitingForRecive.get(id,function(err,clientMessageListCacheWaitingForRecive){
				if(!clientMessageListCacheWaitingForRecive){
				NONoLog.log('error','logic error:impossible to ack ');
				}else{
					clientMessageListCacheWaitingForRecive = JSON.parse(clientMessageListCacheWaitingForRecive);
				}
				AnotherclientMessageListCacheWaitingForRecive = [];
				for(var index = 0;index< clientMessageListCacheWaitingForRecive.length;index++){
					if(clientMessageListCacheWaitingForRecive[index] == data.msg_uid){
						continue;
					}else{
						AnotherclientMessageListCacheWaitingForRecive.push(clientMessageListCacheWaitingForRecive[index]);
					}
				}
				clientMessageListCacheMapWaitingForRecive.set(id,
					JSON.stringify(AnotherclientMessageListCacheWaitingForRecive));
			});
			
			
			break;
		}
		}
	});
   	client.on("end", function() {
   	NONoLog.log('warn','one client disconnected!');
   	});
   	client.on("error", function() {
   		NONoLog.log('warn','one client error!');
   	clientSocketMap.forEach(function(socket,id){
   		if(socket == client){
   			socket.destroy();
   			clientSocketMap.remove(id);
   			clientStateMap.remove(id);

   		}
   	});
   	});
 });
server.listen(7788,function(){
	NONoLog.log('debug','tcp server bound!');
});
/*we check our clients every 30s*/
/**ALIVE - >MID -> DEAD,when the state turn to DEAD,we think the client is not online***/
setInterval(function(){
	clientStateMap.forEach(function(state,id){
		if(state>2||state <0){
			NONoLog.log('error','client state wrong!state can only be 0、1、2');
		}
		switch(state){
			case STATE_ALIVE:
			case STATE_MID:
			clientStateMap.set(id,clientStateMap.get(id)-1);
			break;
			case STATE_DEAD:
			var client = clientSocketMap.get(id);
			if(!client){
				NONoLog.log("error","the client tcp has been removed!!");
			}else{
				client.destroy();
			}
			clientSocketMap.remove(id);
			clientStateMap.remove(id);
			NONoLog.log('debug','remove the offline client');
			break;
		}
	});
},30000);
/***************breaker*****************/
/*********event ***/
eventController.on('send_message',function(receiver_id){
	
	
});
//  var fs = require('fs');
// process.on('uncaughtException', function (err) {

//   fs.appendFile('message.txt', "=================== new error br ===========\n"+err+":"+err.stack, function (err) {
//   });

// });
