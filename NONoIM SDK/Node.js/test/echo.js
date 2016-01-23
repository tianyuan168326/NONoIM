var NONoIM =require('../NONoIM.js');
//const HOST = "121.42.139.190";
const HOST = "127.0.0.1";
const HTTPPORT = 8899;
const TCPPORT = 7788;
const ID= 1;
const PEERID = 1;
var msg_send_num = 0;
var msg_receive_num = 0;
var first_msg_sub_num = 0;
var msg_sub_num = 0;
NONoIM.iniNONoIM(HOST,TCPPORT,ID,function(message,rinfo){
	console.log("get message:%s\n",message.msg_payload);
	if(msg_receive_num ==0){
		first_msg_sub_num = msg_send_num-msg_receive_num;
	}
	msg_receive_num++;

});
NONoIM.setFailCB(function(msg){
	console.log("falied:....%s",JSON.stringify(msg));
});
var count  = 0;
setInterval(function(){
	count++;
	msg_send_num++;
	msg_sub_num = msg_send_num-msg_receive_num;
	console.log('sending message :'+count);
	// console.log('%d testing the message...the message lost now:%d',ID,msg_sub_num-first_msg_sub_num);
	// console.log('%d testing the message...receive_num/send_num = %d/%d',ID,msg_receive_num,msg_send_num);
 	NONoIM.sendMessage("id "+ID+" sending message:"+"counter : "+count+"\n"
 		,PEERID,function(err,bytes){
 		});
				 	}, 1000);
