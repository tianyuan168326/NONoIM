/**
*we save IMID and corresponding ip in redis
*|----|----|------|--------|-----------------------|
*|IMID|ip  |port  |state   | toBeSentIDList        |
*|12  |127 |9191  |1       |['1','2','3','4','5']  |
*|----|----|------|--------|-----------------------|
*Aha,this is an sql-like table
*But when using KVDB like redis,we shoule convert fields(ip/port/state/the msg list) to json,and save this json as value
*
*state{
*	ALIVE:1,
*	DEAD:0
*}
*/
var RedisClients = require('./RedisClients.js');
var NONoLog = require('../NONoIMHelper/NONoLog.js');
var NONoClientInfoRedisServer = RedisClients.getRedisClients().NONoClientInfoRedisServer;
var NONoChatLogRedisServer = require('./NONoChatLogRedisServer.js');
const ALIVE = 1;
const DEAD = 0;
const USER_ID_PREFIX = 'USER_ID';
/**
 * [markClientAlive description]
 * @param  {[type]} id                    [description]
 * @param  {[type]} getdata_erro_heandler [description]
 * @param  {[type]} setdata_erro_heandler [description]
 * @return {[type]}                       [description]
 */
module.exports.markClientAlive = function(id,getdata_erro_heandler,setdata_erro_heandler){
	NONoClientInfoRedisServer.get(USER_ID_PREFIX+Number(id),function(err,reply){
			if(err){
				getdata_erro_heandler(err);
				NONoLog.log('error','error when get info from NONoClientInfoRedisServer');
			}
			if(!reply){
				NONoLog.log('error','some client send heartbeat packet not after loging-on');
			}else{
				reply = JSON.parse(reply);
				reply.state = ALIVE;
				reply = JSON.stringify(reply);
				NONoClientInfoRedisServer.set(USER_ID_PREFIX+Number(id),reply);
			}
		});
};
module.exports.markClientDead = function(id,getdata_erro_heandler,setdata_erro_heandler){
	NONoClientInfoRedisServer.get(USER_ID_PREFIX+Number(id),function(err,reply){
			if(err){
				getdata_erro_heandler(err);
				NONoLog.log('error','error when get info from NONoClientInfoRedisServer');
			}
			if(!reply){
				NONoLog.log('warn','you try to mark an client not in DB dead');
				return ;
			}else{
				reply = JSON.parse(reply);
				reply.state = DEAD;
				reply = JSON.stringify(reply);
				NONoClientInfoRedisServer.set(USER_ID_PREFIX+Number(id),reply);
			}
		});
};
module.exports.addNewClient = function(id,ip,port){
	NONoClientInfoRedisServer.set(USER_ID_PREFIX+Number(id),JSON.stringify(
			{
				ip:ip,
				port:port,
				state:ALIVE
			}
			));
};
/**
 * [appendMessageMission append message mission]
 * @param  {[type]} receiver_id  [description]
 * @param  {[Number]} messsageId          [  ]
 * @param  {[function(err)]} error_handle_chatinfo_db [description]
 * @return {[type]}              [description]
 */
module.exports.appendMessageMission = function(receiver_id,messsageId,error_handle_chatinfo_db){
	NONoClientInfoRedisServer.get(USER_ID_PREFIX+receiver_id,function(err,reply){
		if(err){
			error_handle_chatinfo_db(err);
		}
		reply = JSON.parse(reply);
		if(!reply){
			NONoLog.log('warn','try to append mission to the client not in our system');
			reply = {
				ip:"",
				port:0,
				state:1,
				toBeSentIDList:[]
			};
		}else if(!reply.toBeSentIDList){
			reply.toBeSentIDList  =[];
		}
		reply.toBeSentIDList.push(messsageId);
		NONoClientInfoRedisServer.set(USER_ID_PREFIX+receiver_id,JSON.stringify(reply));
	});
}
/**
 * [checkMessage check if our server has received the msg]
 * @param  {[Number]} receiver_id    [description]
 * @param  {[String]} msg_uid        [description]
 * @param  {[function(Boolean，Object)]} check_callback [check the message is repeating or not]
 * @return {[function(err)]}                [description]
 */
module.exports.checkMessage = function(receiver_id,msg_uid,check_callback,error_handle_chatinfo_db,err_handle_chatlog_db){
	receiver_id = Number(receiver_id);
	msg_uid = Number(msg_uid);
	NONoClientInfoRedisServer.get(USER_ID_PREFIX+receiver_id,function(err,reply){
		error_handle_chatinfo_db(err);
		if(!reply){
			NONoLog.log('warn',"checking the message,but the message's receiver isn't in our db");
		}else{
			reply = JSON.parse(reply);
			msgList = reply.toBeSentIDList;
			if(!msgList){
				check_callback(false);
			}else if(msgList.length == 0){
				check_callback(false);
			}
			for(var msgID in msgList){
				NONoChatLogRedisServer.checkMessageIDAndUid(msgID,msg_uid,check_callback,err_handle_chatlog_db);
			}
		}
	});
}
/* 
 * 
 */  
Array.prototype.remove=function(value){    
  var len = this.length;  
  for(var i=0,n=0;i<len;i++){   
    if(this[i]!=value){    
      this[n++]=this[i];  
    }else{  
     // console.log(i); 
    }  
  }    
  this.length = n;  
};  
module.exports.deleteFromToBeSendList = function(receiver_id,msgUid,error_handle_chatinfo_db,err_handle_chatlog_db){

	receiver_id = Number(receiver_id);
	NONoClientInfoRedisServer.get(USER_ID_PREFIX+receiver_id,function(err,reply){

		if(err){
			error_handle_chatinfo_db(err);
		}if(!reply){
			NONoLog.log('error','deleting msg from toBeSentIDList! but can not find out the message uid ');
			return ;
		}
		reply = JSON.parse(reply);
		msgList = reply.toBeSentIDList;
		for(var index in msgList){
			msg_id = msgList[index];
			NONoChatLogRedisServer.deleteMsg(msg_id,msgUid,function(msg_id){
				NONoLog.log('error','recycle message success!');
				 var len = msgList.length;  
  				for(var i=0,n=0;i<len;i++){   
    				if(msgList[i]!=msg_id){    
      					msgList[n++]=msgList[i];  
    				}else{  
     // console.log(i); 
   				}  
 				 }    
  				msgList.length = n;  

				//msgList.remove(msg_id);
				reply.toBeSentIDList = msgList;
				NONoClientInfoRedisServer.set(USER_ID_PREFIX+receiver_id,JSON.stringify(reply));
			},function(err){});	
			}
	})
}
module.exports.getRedisHandle = function(){
	return NONoClientInfoRedisServer;
}