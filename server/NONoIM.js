/**
*In this beta edition,Usage:
*step 1:client post logon info(id mainly) to your own application server
*step 2:right after step1,your application server should post a request
*       {cmd:"LogOn",sender_id:id},every re-connection should post!
*step 3:your application send an UDP diagram:{cmd:"log_on"}
*step 4:your application begin to send heart beat package every 30-50s,
*       {cmd:"heart",id:your_id}
*
*note:when your application receive diagram :"re-connect",the application should re-op from step1
*Q:why our application should re-op from step1 in every connection?
*A:Considering your application is on mobile end,when you go back home,
*  Your device's net connection will switch from 2G/3G to WIFI
*  It means the IP of your device will change!
*  So all the operation should be run again!
*/
var child_process = require('child_process');
var arguments = process.argv.splice(2);
var options = arguments[0];
console.log("the options=======>%s",options);
switch(options){
		case "-IM-http_post":
		var childRedisProcess  = child_process.fork(
			'./NONoIMHelper/GetPOSTMsgHelper.js'
			, [], {encoding:"utf8"});
		break;
		case "-q":
		console.log("^_^ bye~");
		break;
		case "-h":
		case "-help":
		console.log("only use -IM-http_post now!");
		break;
		default:
		console.log("options error! please use -h or -help to get mannual,or use -q to quite");
		break;
}
