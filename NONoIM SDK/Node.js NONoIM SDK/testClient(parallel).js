var NONoIM =require('./NONoIM.js');
//const HOST = "120.25.81.232";
const HOST = "127.0.0.1";
const HTTPPORT = 8899;
const UDPPORT = 7788;
const ID= Number(process.argv.splice(2)[0]);
const PEERID = 100+1-ID;
console.log("ID:%d,PEER_ID:%d",ID,PEERID);
var msg_send_num = 0;
var msg_receive_num = 0;
var first_msg_sub_num = 0;
var msg_sub_num = 0;
NONoIM.iniNONoIM(HOST,UDPPORT,ID,function(message,rinfo){
	console.log("get message:%s",JSON.stringify(message));
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
	console.log('%d testing the message...the message lost now:%d',ID,msg_sub_num-first_msg_sub_num);
	console.log('%d testing the message...receive_num/send_num = %d/%d',ID,msg_receive_num,msg_send_num);
 	NONoIM.sendMessage("id "+ID+" sending message:"+"counter : "+count
 		,PEERID,function(err,bytes){
 		});
				 	}, 1000);
