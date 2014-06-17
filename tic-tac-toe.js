var TicTacToe = {},
board = $('.board'),
canvas = $('canvas'),
initialBoard = [0,0,0,0,0,0,0,0,0]
board = [0,0,0,0,0,0,0,0,0],
_this = this;

// firebase references
var gameRef = new Firebase('https://blinding-fire-6122.firebaseio.com/'),
playerRef = gameRef.child('player_list'), userRef, boardRef
roomsRef = gameRef.child('rooms');

var _user, //this is the global user
boardStatus; //this is the status of the board at all times

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
		_user = user;
		
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
	for (player in player_list) {
		//if the player is online, show him the lobby
		if (player_list[player].online && (_user === undefined || player != _user.id)) {
			lobbyHTML += '<li data-id="' + player + '">' + player_list[player].displayName + '</li>';
		}
	}
	$('.lobby').html(lobbyHTML);
}

$('.lobby').on('click', 'li', function() {
	alert("hi");
	opponent = $(this).attr("data-id");

	thisGame = {};
	thisGame.board = initialBoard;
	thisGame.firstUser = _user.id;

	myGame = roomsRef.push(thisGame);
	userRef.child('playing').set(myGame.name());
	playerRef.child(opponent).child('playing').set(myGame.name());
})

//this gets called when my own user is updated
function showBoard(snapshot) {
	var me = snapshot.val();
	if (me.playing !== undefined && me.playing !== false) {
		$('.board').removeClass('dimmed'); //show the board

		boardRef = roomsRef.child(me.playing)
		boardRef.on('value', updateBoard);
	}
	else {
		$('.board').addClass('dimmed');
		boardRef = null; //take out boardRef
	}
}

function updateBoard(snapshot) {
	boardStatus = snapshot.val(),
	i = 0;

	if ( boardStatus.board !== null ) {
		board = boardStatus.board;	
	}
	for ( i =0; i < canvas.length; i++ ) {
		if ( board ) {
			if( board[i] != 0 ) {
				$(canvas[i]).html(board[i]);
			} 
		}
	}

	for ( i = 0; i < 9; i++ ) {
		$(canvas[i]).on('mousedown', function(evt, boardRef) {
			placeMarker(evt, boardRef);
		});
	}

	// if ( status.text() === 'It is not your turn!' ) {
	// 	$(status).removeClass('warning');
	// 	$(status).text('Your turn!');
	// }
}

// Board functions
TicTacToe.Board = function () {
	this.initializeBoard();
}

TicTacToe.Board.prototype.initializeBoard = function(boardRef) {
	var self = this;


}

function placeMarker (event, playerRef) {
	var target = event.target,
	turnNum = _this.turnNum ? _this.turnNum : 0,
	canvas;

	if (  boardStatus.firstUser === _user.id ) {
		target.value = 'O';
	} else {
		target.value = 'X';
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

    this.board = new TicTacToe.Board();

    if ( this.ready === true ) {
		this.gameRef.child('hidden').set(false);
    }
}


auth.login('facebook');

// when the board is in a ready state, need to trigger it to be shown and dimmed for the second player

// turnRef.on('value', function(snapshot){
// 	var turnNum = snapshot.val()
// 	_this.turnNum = turnNum;
// })

