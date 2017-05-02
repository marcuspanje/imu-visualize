var server = require('http').createServer();
var io = require('socket.io').listen(server);
server.listen(5000);
var SerialPort = require("serialport");
var sp = new SerialPort("/dev/tty.usbmodem1422",
	{
		baudrate: 9600,
		parser: SerialPort.parsers.readline("\n"),
    autoOpen: false
	});



/* SERIAL WORK */

sp.open(function (error) {
  if ( error ) {
    console.log('failed to open: '+error);
  } else {
    console.log('open');
    sp.on('data', function(data) {
      console.log('data received: ' + data);
      io.sockets.emit('serial_update', data);
    });
  }
});



