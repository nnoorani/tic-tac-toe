var TicTacToe = {},
board = $('.board'),
canvas = $('canvas'),
initialBoard = [0,0,0,0,0,0,0,0]
board = [0,0,0,0,0,0,0,0,0],
_this = this;

// firebase references 
var gameRef = new Firebase('https://blinding-fire-6122.firebaseio.com/'),
boardRef = gameRef.child('board'), 
hiddenRef = gameRef.child('hidden'),
turnRef = gameRef.child('turnNumber');

var NUM_PLAYERS = 2,
LETTER_X = new Image,
LETTER_O = new Image;

LETTER_O.src = 'letter_o.png';
LETTER_X.src = 'letter_x.png'

function start() {
	var user = prompt('Name?', 'Guest'),
	controller = new TicTacToe.Controller(user);
}

var showBoard = function(snapshot) {
	var hidden = snapshot.val();

	if ( hidden === false) {
		$('.board').show();
		$('.status').text('Ready to play!')
	}
}

var updateBoard = function(snapshot) {
	var boardStatus = snapshot.val(),
	i = 0,
	ticSpot;

	if ( boardStatus !== null ) {
		board = boardStatus;	
	}
	for ( i =0; i < canvas.length; i++ ) {
		if( boardStatus && boardStatus[i] != 0 ) {
			ticSpot = canvas[i].getContext('2d');
			ticSpot.fillText(boardStatus[i], 25,25);
		}
	}
}

// Board functions
TicTacToe.Board = function () {
	this.gameRef = gameRef;
	this.boardRef = gameRef.child('board');
	this.gameRef.child('hidden').set(true);
	this.boardRef.set(board)
	this.initializeBoard();
}

TicTacToe.Board.prototype.initializeBoard = function(boardRef) {
	var self = this;

	for ( i = 0; i < 9; i++ ) {
		$(canvas[i]).on('mousedown', function(evt, boardRef) {
			self.placeMarker(evt, boardRef);
		});
	}
}

TicTacToe.Board.prototype.placeMarker = function(event, playerRef) {
	var target = event.target,
	turnNum = _this.turnNum ? _this.turnNum : 0,
	canvas;

	if ( turnNum % 2 === 0 && window.myPlayerRef.marker === 'O' ) {
		target.value = 'O';
	} else if ((turnNum % 2 !== 0) && window.myPlayerRef.marker === 'X' ) {
		target.value = 'X';
	} else {
		console.log('its not your turn');
	}

	if (board[target.id] == 0  && target.value) {
		this.boardRef.child(target.id).set(target.value);
		turnNum += 1;
	}
	this.checkForWins();
	_this.turnRef.set(turnNum);
}

TicTacToe.Board.prototype.checkForWins = function() {
	var i = 0, win, winner; 

	// check columns
	 if (board[0] === board[3] && board[3] === board[6]) {
	 	winner = board[0];
	 	if (winner != 0 ) {
	 		win = true
	 	}
	 } else if ((board[1] === board[4] && board[4] === board[7])) {
	 	winner = board[1];
	 	if (winner != 0 ) {
	 		win = true
	 	}
	 } else if ((board[2] === board[5] && board[5] === board[8])) {
	 	winner = board[2];
	 	if (winner != 0 ) {
	 		win = true
	 	}
	 }
	// check rows
	else if (board[0] === board[1] && board[1] === board[2]) {
		winner = board[0];
		if (winner != 0 ) {
			win = true
		}
	} else if ((board[3] === board[4] && board[4] === board[5])) {
		winner = board[3];
		if (winner != 0 ) {
			win = true
		}
	} else if ((board[6] === board[7] && board[7] === board[8])) {
		winner = board[6];
		if (winner != 0 ) {
			win = true
		}
	}

	// check diagonals
	else if (board[0] === board[4] && board[4] === board[8]) {
		winner = board[0];
		if (winner != 0 ) {
			win = true
		}
	} else if ((board[2] === board[4] && board[4] === board[6])) {
		winner = board[3];
		if (winner != 0 ) {
			win = true
		}
	} 

	if ( win ) {
		console.log(winner + ' is the winner');
	}

	if (_this.turnNum == 8 && !win) {
		alert('Cats game!');
	} else if ( _this.turnNum == 9 && !win ) {
		// set back to zero so the game can restart
		_this.turnNum = 0
	}
}

// game controller functions
TicTacToe.Controller = function(user) {
	this.gameRef = gameRef; 
	this.playState = 0;
	var players = this.waitToJoin(user);
}

// create the board
TicTacToe.Controller.prototype.initializeGame = function() {
	this.board = new TicTacToe.Board();
}

// once player has gotten a spot in the game, we set their player reference
TicTacToe.Controller.prototype.joinGame = function(playerNum) {
	var _this = this;
	this.myPlayerRef = this.gameRef.child('player_list').child(playerNum);
	window.myPlayerRef = this.myPlayerRef;
    this.myPlayerRef.child('connected').onDisconnect().remove();
    this.boardRef = gameRef.child('board');

    if ( playerNum === 0 ) {
    	alert('Player 0 - you play with an O');
    	window.myPlayerRef.marker = 'O';
    } else if ( playerNum === 1 ) {
    	alert('Player 1 - you play with an X');
    	window.myPlayerRef.marker = 'X';
    }

    this.initializeGame();

    if ( this.ready === true ) {
		this.gameRef.child('hidden').set(false);
    }
}

// when a player connects, they need to wait for a spot in the game if the game is already being played
TicTacToe.Controller.prototype.waitToJoin = function(user) {
    var _this = this,
    playersRef = this.gameRef.child('player_list'),
    playerNum, 
    inGame = false
    i = 0;

    playersRef.transaction(function(players) {
    	if (players === null) {
    		players = []
    	}

    	for (i = 0; i < players.length; i++) {
			if (players[i] === user) {
				inGame = true;
				playerNum = i; // Tell completion callback which seat we have.
				return;
			}
		}

		if ( i < NUM_PLAYERS ) {
			players[i] = user;
			playerNum = i;

			if ( playerNum === 1 ) {
				_this.ready = true; 
			}
			_this.players = players;
			return players;
		}
		return false;

    }, function( error, committed) {
    	if (committed) {
    		_this.joinGame(playerNum);
    		_this.gameRef.child('player_list').set(_this.players);
    		console.log('player ' + playerNum + ' is online');
    	} else if ( error ) {
    		console.log('You were not let in, sorry!');
    	}
    });
}

start();

// when the board is in a ready state, need to trigger it to be shown and dimmed for the second player
hiddenRef.on('value', showBoard);
boardRef.on('value', updateBoard)
turnRef.on('value', function(snapshot){
	var turnNum = snapshot.val()
	_this.turnNum = turnNum;
})

