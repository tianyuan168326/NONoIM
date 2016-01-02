var NONoProtocol = {};
var factory = function() {
	 NONoProtocol = {
		get:function(NONoProctolType) {
			switch(NONoProctolType){
				/************for receive**************/
				case "log_on":
				return {
					cmd:"log_on",
					id:null
				};
				break;
				case "heart":
				return {
					cmd:"heart",
					id:null
				};
				break;
				
				break;
				case "ack_message":
				return {
					cmd:"ack_message",
					id:null,
					msg_sender_id:null,
					msg_uid:null
				};
				case "send_message":
				return {
					cmd:"send_msg",
					id:null,
					receiver_id:null,
					msg:{
						msg_type:null,
						msg_payload:null,
						msg_uid:null
					}
				};
				break;
				/************for send**************/
				case "ack_got_message":
				return {
				cmd:"ack_got_message",
				msg_uid:null
				};
				break;
				case "new_message":
				return {
					cmd:"new_message",
					msg_sender_id:null,
					msg_type:null,
					msg_payload:null,
					msg_uid:null
				};
				break;
				/************default**************/
				default:
				return null;
				break;
			}
		}
	};
	return  NONoProtocol;
};
module.exports = factory;