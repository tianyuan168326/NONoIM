var NONoLog = require('./NONoLog.js');
var HashMap = require('hashmap');
var NONoSocket =null;
var NONoPushMsgCB = {};
var NONoId=0;
var NONo_SERVER_IP = "";
var NONo_SERVER_PORT = 0;
var TcpPacketParser = require('./TcpPacketParser.js');
var tcpPacketParser = new TcpPacketParser.TcpPacketParser();
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

var messageMap = new HashMap();
/**** sending history array********/
var sendHistoryArray = [];
/**
 * 
 */
var receiver_message_map = {};
setInterval(function(){
	messageMap.forEach(function(message,msg_uid){
		/**we have send,but not received the ack***/
		if(sendHistoryArray.indexOf(msg_uid)!=-1){
			sendMsgFailedHandler(message);
		}
	});
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
				id:NONoId
			};
	var heartBeatJson = {
				cmd:"heart",
				id:NONoId
			};
	var logOnJsonString = JSON.stringify(logOnJson);
	var heartBeatJsonString = JSON.stringify(heartBeatJson);
	  NONoSocket = require('net').connect({
 	host:NONo_SERVER_IP,
     port: NONo_SERVER_PORT
 	},function(){
 		NONoSocket.setEncoding('utf8');
		NONoSocket.setTimeout(0);
		NONoSocket.setNoDelay(true);
		NONoSocket.write(TcpPacketParser.tcpSenderPacketWrapper(logOnJsonString) );
		setInterval(function(){
			NONoSocket.write(TcpPacketParser.tcpSenderPacketWrapper(heartBeatJsonString) );
				 	}, 30000);
	});
	
	NONoSocket.on('data',function(data){
		tcpPacketParser.grabPacket(data.toString());
		var tcpPacket;
		while(tcpPacket = tcpPacketParser.parsePacket()){
			
			try{
				msg = JSON.parse(tcpPacket);
			}catch(e){
				NONoLog.log('debug',tcpPacket);
				continue;
			}
		switch(msg.cmd){
			/**
			 * normal message
			 * {"msg_type":1,"msg_payload":"id 1 sending message:counter : 8","msg_uid":"1-1451145715900"}
			 */
			case "new_message":
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
		 		newMessageCB(msg);
		 	}
		 	var ACKToServer = {
		 		cmd:"ack_message",
		 		id:NONoId,
		 		msg_uid:msg.msg_uid,
		 		msg_sender_id:msg.msg_sender_id
		 	};
		 	var ACKToServerString = JSON.stringify(ACKToServer);
		 	NONoSocket.write(TcpPacketParser.tcpSenderPacketWrapper(ACKToServerString) );
			break;
			/**
			 * ack message(some message has been send success) from server
			 * we delete it from our local cache
			 * {msg_type:2,msg_uid:"1-1451145715900"}
			 */
			case 'ack_got_message':
			//messageMap[msg.msg_uid].state = 1;
			console.log('sweep up uid');
			messageMap.remove(msg.msg_uid);
			break;
		}
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
	const msg_uid = NONoId+"-"+Number(new Date().getTime());
	var messageJson={
				cmd:"send_msg",
				id:NONoId,
				receiver_id:receiver_id,
				msg:{
					msg_type:1,
					msg_payload:message,
					msg_uid:msg_uid
				}
			};
	var messageJsonString = JSON.stringify(messageJson);
	messageMap.set(msg_uid,messageJson);
	NONoSocket.write(TcpPacketParser.tcpSenderPacketWrapper(messageJsonString));
	sendHistoryArray.push(msg_uid);
}
 var fs = require('fs');
// process.on('uncaughtException', function (err) {
 
//   fs.appendFile('message.txt', err+":"+err.stack, function (err) {
    
//   });
// });