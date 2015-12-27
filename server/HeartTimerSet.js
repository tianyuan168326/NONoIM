/**
 * every message send to client has its own type
 * 1:normal message
 * 2:ack message
 * 
 */
var redis = require('redis');
var ServerConfig = require('./config/ServerConfig.json');
var RedisClients = require('./components/RedisClients.js');
var NONoLog = require('./NONoIMHelper/NONoLog.js');
var child_process = require('child_process');
var NONoChatLogRedisServer= require('./components/NONoChatLogRedisServer.js');
var NONoClientInfoRedisServer = require('./components/NONoClientInfoRedisServer.js');
const ALIVE = 1;
const DEAD = 0;
const USER_ID_PREFIX = 'USER_ID';
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
process.on('messsage',function(message,handle){
	switch(messsage.cmd){
		case "new_log_on":
		clientMap[messsage.data.id] = DEAD;
		break;
	}
});
var dgram = require('dgram');
var server = dgram.createSocket("udp4");
/**
 *The State-Machine for UDP message
 *client states:logon->alive<------>dead
 *send message(for client):
 *   the server get the msg->
 *   the server create a tobesend msg(ack the msg) to sender->
 *   send the ack message to sender->
 *   the sender's client show sended state
 *   note:we should add re-send policy,after our client send a message,
 *   the message from client should include an uid(hashed by clientid an clientmsgindex),
 *   we should ini a timer(T:500ms) to re-send the message to server,
 *   when the server get this message,differ its uid from receiver's tobesendlist's uid,
 *   if finding the same one,drop the message,else：,But no mater whether server has a
 *   same uid msg,server should always send ack to client(sender) again
 *   
 *receive message(for client):
 *	 the server send message to reciver->
 *	 if the server get an receiver ack:
 *   the server get the ack,delete the message in chatlogdb,delete the tobesent from the clientinfo
 *   otherwise,the server re-send the message,the receiver also choose to drop or
 *   save the message by comparing the uid,but always send an ack again
 */
/**
 * future:test the message lost-rate and do some profile
 */
server.on("message",function(msg,rinfo) {
	msg = JSON.parse(msg);
	switch(msg.cmd){
		/**
		 * {
		 * 		cmd:"ack",
		 * 		id:1,
		 * 		msg_uid:"1-12334"
		 * }
		 */
		case 'ack':
		
		NONoClientInfoRedisServer.deleteFromToBeSendList(msg.id,msg.msg_uid);
		break;
		/**
		*for step2
		*	{
		*		cmd:"log_on",
		*		id:"1"
		*	}
		*/
		case "log_on":
		clientMap[Number(msg.id)] = ALIVE;
		NONoClientInfoRedisServer.addNewClient(msg.id,rinfo.address,rinfo.port);
		break;
		/**
		*for heart beat
		*	{
		*		cmd:"heart",
		*		id:"1"
		*	}
		*/
		case "heart":
		/**
		 * when we recive the heartbeat packet,firstly we mark it online in clientMap
		 * then We mark it online in NONoClientInfoRedisServer
		 */
		clientMap[msg.id] = ALIVE;
		NONoClientInfoRedisServer.markClientAlive(msg.id);
		break;
		/**
		*for IM(UDP Channel)
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
		*/
		case "send_msg":
		/**
		*when the client send the msg,we clean its(sender's) heartbeat flag too
		*/
		clientMap[msg.id] = 1;
		NONoClientInfoRedisServer.markClientAlive(msg.id);

		NONoClientInfoRedisServer.checkMessage(msg.receiver_id,msg.msg.msg_uid,function(is_repeat){
			/**
			 * [if our server not get the message]
			 * save and  send the message
			 */
			
			if(!is_repeat){
				/**
		 		* Always save the chat message
		 		*/
				NONoChatLogRedisServer.saveMessage(msg,function(err){
					if(err){
						NONoLog.log('error',require('util').format('error in saving chat log :%s',err));
					}
					
					});
				}
				NONoClientInfoRedisServer.getRedisHandle().get(USER_ID_PREFIX+Number(msg.receiver_id),function(err,reply){
				reply = JSON.parse(reply);
				/**
			 	*when the receiver is not alive,we just return
			 	*/
				if(!reply || reply.state ==DEAD){
					return;
				}
				if(!is_repeat){
					/**
					 * transfer to another part to send the message
					 * every time , we try send all the tobeSend msg of receiver
			 		 */
					NONoChatLogRedisServer.getRedisHandle().publish("MSG_CHANNEL",JSON.stringify({
					message_list:reply.toBeSentIDList,
					peer_id:msg.receiver_id,
					peer_port:reply.port,
					peer_ip:reply.ip}));
				}
				/**
				 * always send ack again
				**/
				NONoChatLogRedisServer.getRedisHandle().publish("ACK_CHANNEL",JSON.stringify({
					ack_id:msg.id,
					ack_msg_uid:msg.msg.msg_uid,
					ack_peer_port:reply.port,
					ack_peer_ip:reply.ip
				}));
			
		} );

		},function(err){
			if(err){
					NONoLog.log('error',require('util').format('error in get message list :%s',err));
				}
		},function(err){
			if(err){
					NONoLog.log('error',require('util').format('error in get chat log :%s',err));
			}
		}
		);
		break;
  		//console.log("Server got: "+msg+" from "+rinfo.address+":"+rinfo.port);
  		}
}).
bind(7788);

server.on("listening",function() {
	//childFetchRedisDataAndSendProcess.send("server",server);
  var address = server.address();
});
/**
 * We check Our clientMap evevry 1minute
 * When the client is offline(over 30s not send Heartbeat Packet),we delete its id from clientMap's keys and mark it dead in redis
 * When the client is online,We just sweep its state flag
 * When the client is not in the Map or DEAD in redis,We just save all messages sended to it in ChatLog DB.
 */
setInterval(function(){
	for(var entry in clientMap){
		if(clientMap[entry] == 0){
			NONoClientInfoRedisServer.markClientDead[entry];
			 clientMap[entry] = undefined;
		}else{
			clientMap[entry] = 0;
		}
	}}
	, 60000);
/***
*The file is to handle all the sending operation(including Push service and IM)
*Just Fetch Data From ChatLogRedisServer
*Drivered by Sub/Pub model in Redis
*Other Process just publish a "MSG_CHANNEL",then this process sends it!
*Message structure(note:in json string)
*{
*	message_list:['1','2','3'],
*	peer_id:xxx,
*	peer_port:xxxxx,
*	peer_ip:xxx.xx.xx.xx
*}
*/
/*
*The Server-side UDP Socket
*note:Traditionaly,in one server application,only one Server-side UDP Socket
*So we get id from parent process through process.on
*/
var NONoIMUDPSender=server;
NONoRedisClientDisPatcher = redis.createClient(ServerConfig.ChatLogRedisServer.PORT
												,ServerConfig.ChatLogRedisServer.IP);
NONoRedisClientDisPatcher.on('subscribe',function(channel,count){
	NONoLog.log('debug',"sub/pub model open !");
});
NONoRedisClientDisPatcher.on('message',function(channel,message){
	message = JSON.parse(message);
	switch(channel){
		case "MSG_CHANNEL":
		for(var key in message.message_list){
			var messageId = Number(message.message_list[key]);
			// if(!messageId){
			// 	NONoLog.log('warn',"get null in message_list");
			// 	continue;
			// }
			NONoChatLogRedisServer.getRedisHandle().get(messageId,function(err,obj){
				if(err){
					NONoLog.log('error',require('util').format('error in get chat log :%s',err));
				}if(!obj){
					NONoLog.log('warn',"get null in chat log db");
					return ;
				}
				obj = JSON.parse(obj);
				NONoClientInfoRedisServer.getRedisHandle().get(USER_ID_PREFIX+Number(obj.receiver_id),function(err,reply){
					reply = JSON.parse(reply);
					var msgPayLoad = new Buffer(JSON.stringify(obj.msg));
					NONoLog.log('debug',require('util').format("send ====%s====>%s:%d",JSON.stringify(obj.msg),
						reply.ip,reply.port));
					NONoIMUDPSender.send(msgPayLoad,0,msgPayLoad.length,
					reply.port,reply.ip,function(err,bytes){
					if(err){
						NONoLog.log('error',require('util').format('error in FetchRedisAndSend.js:%s',err));
					}
					});
				});

				
			});
		}
		break;
		/**
		 * {
		 *			ack_id:msg.id,
		 *			ack_msg_uid:msg.msg.msg_uid,
		 *			ack_peer_port:reply.port,
		 *			ack_peer_ip:reply.ip
		 *		}
		 *	note: by json string
		 */
		case "ACK_CHANNEL":
		var ack_message = {
			msg_type:2,
			msg_uid:message.ack_msg_uid
		};
		if(!message.ack_peer_port || !message.ack_peer_ip){
			NONoLog.log('error','prepare to send ask to client,but cannot find out info in db');
		}
		var ack_messagePayLoad = new Buffer(JSON.stringify(ack_message));
		NONoIMUDPSender.send(ack_messagePayLoad,0,ack_messagePayLoad.length,
							message.ack_peer_port,message.ack_peer_ip,function(err,bytes){});
		break;
	}
});
NONoRedisClientDisPatcher.subscribe("MSG_CHANNEL");
NONoRedisClientDisPatcher.subscribe("ACK_CHANNEL");
