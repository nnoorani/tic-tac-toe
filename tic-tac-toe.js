var TicTacToe = {},
board = $('.board'),
canvas = $('canvas'),
initialBoard = [0,0,0,0,0,0,0,0,0]
board = [0,0,0,0,0,0,0,0,0],
_this = this;

// firebase references
var gameRef = new Firebase('https://blinding-fire-6122.firebaseio.com/'),
playerRef = gameRef.child('player_list'), userRef;

//set up assets
LETTER_X = new Image,
LETTER_O = new Image;
LETTER_O.src = 'letter_o.png';
LETTER_X.src = 'letter_x.png'

//this gets called for login
var auth = new FirebaseSimpleLogin(gameRef, function(error, user) {
	//we have a user, YAY!
	if ( user ) {
		$('h2').text('Welcome ' + user.displayName +'!'); //welcome our user
		
		userRef = playerRef.child(user.id); //setup gloabl db
		userRef.child('displayName').set(user.displayName); //add user to firebase
		
		manageConnection(user); //online status
		userRef.on('value', showBoard); //show the board when playing

		controller = new TicTacToe.Controller(user); //start the app
	}
});

//sets online status to true/false on connect/disconect
function manageConnection(user) {
	onlineRef = userRef.child('online'),
	connectedRef = new Firebase('https://blinding-fire-6122.firebaseio.com/.info/connected');
	connectedRef.on('value', function(snap) {
	  if (snap.val() === true) {
	    var con = onlineRef.set(true);
	    onlineRef.onDisconnect().set(false);
	  }
	});
}

//this gets called when the player list is updated
playerRef.on('value', updateLobby);
function updateLobby(snapshot) {
	var player_list = snapshot.val()	
	lobbyHTML = '';
	for ( player in player_list ) {
		//if the player is online, show him the lobby
		if (player_list[player].online) {
			lobbyHTML += '<li>' + player_list[player].displayName + '</li>';
		}
	}
	$('.lobby').html(lobbyHTML);
}

//this gets called when my own name is updated
function showBoard(snapshot) {
	var me = snapshot.val();
	if (me.playing) $('.board').removeClass('dimmed');
	else $('.board').addClass('dimmed');
}

function updateBoard(snapshot) {
	var boardStatus = snapshot.val(),
	i = 0,
	ticSpot, 
	status = $('.status');

	if ( boardStatus !== null ) {
		board = boardStatus;	
	}
	for ( i =0; i < canvas.length; i++ ) {
		if ( boardStatus ) {
			ticSpot = canvas[i].getContext('2d');
			if( boardStatus && boardStatus[i] != 0 ) {
				ticSpot.font = '100px Tahoma';
				ticSpot.textAlign = 'center';
				ticSpot.fillText(boardStatus[i], 50,85);
			} else if ( boardStatus[i] == 0 ) {
				ticSpot.clearRect(0,0,100,100)
			}
		}
		
	}

	if ( status.text() === 'It is not your turn!' ) {
		$(status).removeClass('warning');
		$(status).text('Your turn!');
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
		$('.status').addClass('warning');
		$('.warning').text('It is not your turn!')
	}

	if (board[target.id] == 0  && target.value) {
		this.boardRef.child(target.id).set(target.value);
		turnNum += 1;
	}
	this.checkForWins();
	_this.turnRef.set(turnNum);
}

TicTacToe.Board.prototype.checkForWins = function() {
	var k = 0, 
	// all win possibilities (diagonals, columns, rows)
	wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [6,4,2]],
	winner;

	for ( k; k < wins.length; k++ ) {
        var pattern = wins[k];
        if ( !winner ) {
	        var p = board[pattern[0]] + board[pattern[1]] + board[pattern[2]];
	        if (p == "XXX") {
	          winner = 'X';
	        } else if (p == "OOO") {
	          winner = 'O'
	        }
    	}
    }

	if ( winner ) {
		console.log(winner + ' is the winner');
		$('.status').addClass('winner').text(winner + ' is the winner!');
		boardRef.set(initialBoard);
	}

	if (_this.turnNum == 8 && !winner) {
		$('.status').addClass('winner').text('Cats game!');
	} else if ( _this.turnNum == 9 && !winner ) {
		// set back to zero so the game can restart
		_this.turnNum = 0
	}
}

// game controller functions
TicTacToe.Controller = function(user) {
	this.gameRef = gameRef; 
	this.playState = 0;
}

// create the board
TicTacToe.Controller.prototype.initializeGame = function() {
	this.board = new TicTacToe.Board();
}

// once player has gotten a spot in the game, we set their player reference
TicTacToe.Controller.prototype.joinGame = function(playerNum) {
	this.myPlayerRef = this.gameRef.child('player_list').child(playerNum);
	window.myPlayerRef = this.myPlayerRef;

    if ( playerNum === 0 ) {
    	$('.player').text('You are Player O');
    	_this.myPlayerRef.marker = 'O';
    } else if ( playerNum === 1 ) {
    	$('.player').text('You are Player X');
    	_this.myPlayerRef.marker = 'X';
    }

    this.initializeGame();

    if ( this.ready === true ) {
		this.gameRef.child('hidden').set(false);
    }
}


auth.login('facebook');

// when the board is in a ready state, need to trigger it to be shown and dimmed for the second player
// boardRef.on('value', updateBoard)
// turnRef.on('value', function(snapshot){
// 	var turnNum = snapshot.val()
// 	_this.turnNum = turnNum;
// })

