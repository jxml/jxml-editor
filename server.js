var express = require('express'),
	app = express(),
	http = require('http'),
	server = http.createServer(app);

app.use('/', express.static(__dirname + '/public'));
app.use('/lib', express.static(__dirname + '/node_modules/jxml/public/lib'));
app.use('/lib', express.static(__dirname + '/node_modules/jxml/node_modules/systemjs/dist'));
app.use('/lib/jx', express.static(__dirname + '/jx'));

var WebSocketServer = require('ws').Server,
	wss = new WebSocketServer({ server: server });

wss.on('connection', on_ws);

var PORT = 3000;

server.listen(PORT);

console.log('Listening on port', PORT + '...');

var DataNode = require('datanode'),
	FileSystemRoot = DataNode.FileSystemRoot;

var fs_root = new FileSystemRoot();

function Client(socket, root) {
	this.$root = root
	this.path  = []; // default to serving from root node
	this.socket = socket;

	var self = this;

	socket.on('message', function(m) {
		try {
			var json = JSON.parse(m);
		}
		catch(e) {
			console.log('Bad JSON:', m);
			return;
		}

		self.oncmd(json);
	});
}

// Root sent updates
Client.prototype.onupdate = function(path, data) {
	// forward to client
	this.socket.send(JSON.stringify({ path: path, data: data }));

	var log = [ path, data ].join(' ').replace(/\s+/g, ' ').substr(0, process.stdout.columns - 20);

	console.info('client <<', log);
}

// Client sent data
Client.prototype.oncmd = function(m) {
	console.info('client >>', m);

	var call = m[0], path = m[1], params = m[2],
		$root = this.$root.$root;

	switch (call) {
		case 'bind':
			$root.bind(path, this, params);
			break;

		case 'unbind':
			$root.$$unbind(path, this, params);
			break;

		case 'get':
			$root.$get(path, this, params);
			break;

		case 'kill':
			$root.kill(path);
			break;

		case 'write':
			$root.write(path, params);
			break;
	}
}

function on_ws(ws) {
	new Client(ws, fs_root);
}

