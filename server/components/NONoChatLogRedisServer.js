/**
 * In ChatLog RedisServer
 * Key:"GlobalMesssageIndex",Value: [Number] [Used for MessageIndex,when a message get into DB,GlobalMesssageIndex incr]
 *|----------|---------------------------------------------------------------------------------------------|
 *|MesssageId|message                                                                                      |
 *|12        |{receiver_id:1,msg:{msg_type:1,msg_payload:"the message payload",msg_uid:"id-timestamp"}     |
 *|----------|---------------------------------------------------------------------------------------------|
 */
var RedisClients = require('./RedisClients.js');
var NONoLog = require('../NONoIMHelper/NONoLog.js');
var NONoChatLogRedisServer = RedisClients.getRedisClients().NONoChatLogRedisServer;
var NONoClientInfoRedisServer = require('./NONoClientInfoRedisServer.js');
const ALIVE = 1;
const DEAD = 0;
/**
 * [saveMessage  save msg in chatlog server,append the msg id to client info's msg-list]
 * @param  {[Object]} message    [{receiver_id:1,msg:{msg_type:1,
 *                               msg_payload:"the message payload",
 *                               msg_uid:"message uid"
 *                               } }]
 * @param  {[function(err)]} err_handle_chatlog_db [the handle to redis.hgetall]
 * @return {[null]}            [null]
 */
module.exports.saveMessage = function(message,err_handle_chatlog_db){
	NONoChatLogRedisServer.incr('GlobalMesssageIndex');
	NONoChatLogRedisServer.get('GlobalMesssageIndex',function(err,messageId){
		NONoChatLogRedisServer.set(Number(messageId),JSON.stringify(message),function(err){
			if(err){
				err_handle_chatlog_db(err);
			}
			NONoClientInfoRedisServer.appendMessageMission(
				message.receiver_id,
				messageId
				,function(err){
					NONoLog.log('error',"append message mission error!");
				});
		});
	});
};
/**
 * [checkMessageIDAndUid description]
 * @param  {[type]} msg_id                [description]
 * @param  {[type]} msg_uid               [description]
 * @param  {[type]} check_callback        [description]
 * @param  {[type]} err_handle_chatlog_db [description]
 * @return {[type]}                       [description]
 */
module.exports.checkMessageIDAndUid = function(msg_id,msg_uid,check_callback,err_handle_chatlog_db){
	msg_id = Number(msg_id);
	NONoChatLogRedisServer.get(msg_id,function(err,obj){
		err_handle_chatlog_db(err);
		obj = JSON.parse(obj);
		if(!obj || !obj.msg_uid){
			NONoLog.log('warn',"the message ID isn't in db");
			check_callback(false);
		}else if(msg_uid === obj.msg_id){
			check_callback(true);
		}
		check_callback(false);
	})
}
/**
 * [deleteMsg description]
 * @param  {[Number]} msg_id                [description]
 * @param  {[String]} msgUid                [description]
 * @param  {[type]} match_callback        [description]
 * @param  {[type]} err_handle_chatlog_db [description]
 * @return {[type]}                       [description]
 */
module.exports.deleteMsg = function(msg_id,msgUid,match_callback,err_handle_chatlog_db){
	msg_id = Number(msg_id);
	NONoChatLogRedisServer.get(msg_id,function(err,reply){
		err_handle_chatlog_db(err);
		obj = JSON.parse(reply);
		if(!obj || !obj.msg.msg_uid){
			NONoLog.log('error',"can not find the msg_uid in db");
			return ;
		}
		if(obj.msg.msg_uid === msgUid){
			match_callback(msg_id);
		}
	});
}
/**
 * [getRedisHandle ]
 * @return {[Object]} [Redis Client object]
 */
module.exports.getRedisHandle = function(){
	return NONoChatLogRedisServer;
}