
/********
*unsafe now:the packet header.not consider
*->the message contains string like "34:" 
*->the tcp packet not  received on time
***********/
exports.TcpPacketParser = function(){
	var private ={
		 packetCache:''
	};
	var public = {
		grabPacket:function(packet){
			private.packetCache += packet;
		},
		parsePacket:function(){
			//console.dir(private.packetCache);
			var res = private.packetCache.match(/[1-9][0-9]*:/);
			//console.dir(res);
			if(!res){
				return false;
			}
			var matchResult = res[0];
			var matchIndex = res.index;
			var matchLength = matchResult.length; /**3333:*/
			//console.log("matchLength :"+matchLength);
			var packetSizeString = matchResult.substr(0,matchLength-1);/**'3333'*/
			//console.log("packetSizeString :"+packetSizeString);
			var packetSize = Number(packetSizeString);/**3333*/
			//console.log("old packetCache->"+private.packetCache);
			var packet = private.packetCache.substr(matchLength,packetSize);
			var newCacheBeginIndex  =matchIndex+matchLength+packetSize;
			var newCacheEndIndex = private.packetCache.length-1;
			//console.log("newCacheBeginIndex:"+newCacheBeginIndex);
			//console.log("newCacheEndIndex:"+newCacheEndIndex);
			if(newCacheBeginIndex > newCacheEndIndex-1){
				private.packetCache = '';
			}else{
				private.packetCache = private.packetCache.substring(newCacheBeginIndex,newCacheEndIndex);
			}
			//console.log("new packetCache->"+private.packetCache);
			return packet;
		}
	}
	return public;
}
exports.tcpSenderPacketWrapper = function(packet){
	return packet.length+':'+packet;
}