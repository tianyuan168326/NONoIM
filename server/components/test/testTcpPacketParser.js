var TcpPacketParser = require('../TcpPacketParser.js');
var tcpPacketParser = new TcpPacketParser.TcpPacketParser();
var msg = "I LOVE YOU";
console.log(TcpPacketParser.tcpSenderPacketWrapper(msg));
tcpPacketParser.grabPacket("12:I FUCK YOURR");
var tcpPacket = null;
while(tcpPacket = tcpPacketParser.parsePacket()){
	console.log(tcpPacket);
}
tcpPacketParser.grabPacket("13:I FUCK YOURRR");
tcpPacketParser.grabPacket("14:I FUCK YOURRRR");
while(tcpPacket = tcpPacketParser.parsePacket()){
	console.log(tcpPacket);
}