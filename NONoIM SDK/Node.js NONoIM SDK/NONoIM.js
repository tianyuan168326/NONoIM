var dgram = require('dgram');
var NONoUDPSender = dgram.createSocket('udp4');
var NONoPushMsgCB = {};
var NONoId=0;
var NONo_SERVER_IP = "";
var NONo_SERVER_PORT = 0;

var sendMsgFailedHandler= {};
/**
 * key by uid
 * value:{
 * 				state:0,
 *				cmd:"send_msg",
 *				id:NONoId,
 *				receiver_id:receiver_id,
 *				msg:{
 *					msg_type:1,
 *					msg_payload:message
 *				}
 *			}
 */
var messageMap = {};
/**
 * 
 */
var receiver_message_map = {};
setInterval(function(){
	for(var msg_uid in messageMap){
		sendMsgFailedHandler(messageMap[msg_uid]);
	}
},5000);
/**
 * @ip  {[String]} NONoIM server IP
 * @port  {[Number]} NONoIM server Port
 * @id {[Number]} your client ID,make sure it in your server is non-repeating
 * @newMessageCB {function(String,rinfo)} a client defined callback,when new msg coming,call it
 * @return {[Boolean]} true if success
 */
module.exports.iniNONoIM = function(ip,port,id,newMessageCB){
	NONoId = id;
	NONo_SERVER_PORT = port;
	NONo_SERVER_IP = ip;
	var logOnJson ={
				cmd:"log_on",
				id:id
			};
	var heartBeatJson = {
				cmd:"heart",
				id:id
			};
	var logOnJsonPayLoad = new Buffer(JSON.stringify(logOnJson));
	NONoUDPSender.send(logOnJsonPayLoad,0,logOnJsonPayLoad.length,
		port,ip,function(err,bytes){
			if(err ==0){
			console.log("NONoIM client SDK:send udp logon success");
			{
				 setInterval(function(){
 						var heartBeatJsonPayLoad = new Buffer(JSON.stringify(heartBeatJson));
						NONoUDPSender.send(heartBeatJsonPayLoad,0,heartBeatJsonPayLoad.length,
							port,ip,function(err,bytes){
							if(err == 0){
							console.log("NONoIM client SDK:send udp heart beat success");
							}
						});
				 	}, 30000);
			}
			}else{
			console.log("NONoIM client SDK:send udp logon failed!");	
			}
		});
	NONoUDPSender.on('message',function(msg,rinfo){
		msg = JSON.parse(msg.toString());
		switch(msg.msg_type){
			/**
			 * normal message
			 * {"msg_type":1,"msg_payload":"id 1 sending message:counter : 8","msg_uid":"1-1451145715900"}
			 */
			case 1:
			/**
			*we got the message tell the server
		 	* {
		 	* 		cmd:"ack",
		 	* 		id:NONoId,
			* 		msg_uid:"1-12334"
		 	* }
		 	*/
		 	if(!receiver_message_map[msg.msg_uid]){
		 		receiver_message_map[msg.msg_uid] = msg;
		 		newMessageCB(msg,rinfo);
		 	}
		 	
		 	var ACKToServer = {
		 		cmd:"ack",
		 		id:NONoId,
		 		msg_uid:msg.msg_uid
		 	}
		 	var messageJsonPayLoad = new Buffer(JSON.stringify(ACKToServer));
			NONoUDPSender.send(messageJsonPayLoad,0,messageJsonPayLoad.length,
			NONo_SERVER_PORT,NONo_SERVER_IP,function(err,bytes){
			if(!err){
			}
			});
			
			break;
			/**
			 * ack message(some message has been send success) from server
			 * we delete it from our local cache
			 * {msg_type:2,msg_uid:"1-1451145715900"}
			 */
			case 2:
			//messageMap[msg.msg_uid].state = 1;
			console.log('sweep up uid');
			messageMap[msg.msg_uid] = undefined;
			break;
		}
		
	});
}
/**
 * [setFailCB compulsory]
 * @param {[type]} FailCB [description]
 */
module.exports.setFailCB = function(FailCB){
	sendMsgFailedHandler = FailCB;
}
/**
 * @PushMsgCB {[function(msg)]} Push message callback
 */
module.exports.setPushMsgCB=function(PushMsgCB){
	NONoPushMsgCB = PushMsgCB;
}
/**
 * @message  {[type]} sended message
 * @receiver_id  {[type]} message receiver id
 * @send_callback {[type]} send_callback
 */
module.exports.sendMessage = function(message,receiver_id,send_callback){
	const msg_uid = NONoId+"-"+Date.now();
	var messageJson={
				state:0,
				cmd:"send_msg",
				id:NONoId,
				receiver_id:receiver_id,
				msg:{
					msg_type:1,
					msg_payload:message,
					msg_uid:msg_uid
				}
			};
	messageMap[msg_uid]  =messageJson;
	var messageJsonPayLoad = new Buffer(JSON.stringify(messageJson));
	NONoUDPSender.send(messageJsonPayLoad,0,messageJsonPayLoad.length,
		NONo_SERVER_PORT,NONo_SERVER_IP,function(err,bytes){
			send_callback(err,bytes);
			if(!err){
			}
		});
}