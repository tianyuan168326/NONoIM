var colors = require('colors');
colors.setTheme({
	error:"red",
	warn:"green",
	debug:"magenta"
});

module.exports.log=function(level,message){
	switch(level){
		case "error":
		console.log(message.error);
		break;
		case "warn":
		//console.log(message.warn);
		break;
		default:
		//console.log(message.debug);
		break;
	}
};