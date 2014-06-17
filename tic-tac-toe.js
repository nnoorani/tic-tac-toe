var board = $('.board'),
canvas = $('.canvas'),
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
		_user = user; //for reference in other places
		
		manageConnection(user); //online status
		userRef.on('value', showBoard); //show the board when playing
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
		if (player_list[player].online //the player is online
			&& (_user === undefined || player != _user.id) //and its not me
			&& (player_list[player].playing === undefined || player_list[player].playing === false)) { //and the player is not in a game
			lobbyHTML += '<li data-id="' + player + '">' + player_list[player].displayName + '</li>';
		}
	}
	$('.lobby').html(lobbyHTML);
	if ($('.lobby').children().length === 0) {
		$('.lobby').text('No one else is playing right now');
	}
}

//when i click on someone in the lobby
$('.lobby').on('click', 'li', function() {
	//who did i click on in the lobby
	opponent = $(this).attr("data-id");

	//lets set up a new game
	thisGame = {};
	thisGame.board = initialBoard;
	thisGame.o = userRef.name();
	thisGame.x = opponent;	

	//let firebase know that both me and my opponent are now playing
	myGame = roomsRef.push(thisGame);
	userRef.child('playing').set(myGame.name());
	playerRef.child(opponent).child('playing').set(myGame.name());
})

//this gets called when my own user is updated
function showBoard(snapshot) {
	_user = snapshot.val(); //update my user as i go

	//if i am playing a game, lets make me this game :D
	if (_user.playing !== undefined && _user.playing !== false) {
		$('.board').removeClass('dimmed'); //show the board

		boardRef = roomsRef.child(_user.playing) //set up the reference to my game
		boardRef.on('value', updateBoard);
	}
	else {
		$('.board').addClass('dimmed');
		boardRef = null; //take out boardRef
	}
}

//this gets called every time the board gets udpated
function updateBoard(snapshot) {
	boardStatus = snapshot.val(),
	i = 0,
	info = $('.info');

	if ( boardStatus.board !== null ) {
		board = boardStatus.board;	
	}
	
	for ( i =0; i < canvas.length; i++ ) {
		if (board && board[i] != 0 ) {
			$(canvas[i]).html(board[i]);
		} 
	}


	if ( boardStatus.winner ) {
		$('.info').text(boardStatus.winner + ' is the winner');
		// let's make a new game for them again
		opponent = boardStatus.x;

		//lets set up a new game
		newGame = {};
		newGame.board = initialBoard;

		// switch who starts first this time
		newGame.o = boardStatus.x;
		newGame.x = boardStatus.o;	

		//let firebase know that both me and my opponent are now playing
		myNewGame = roomsRef.push(newGame);
		userRef.child('playing').set(myNewGame.name());
		playerRef.child(opponent).child('playing').set(myNewGame.name());
	}

	for ( i = 0; i < 9; i++ ) {
		$(canvas[i]).on('mousedown', function(evt) {
			placeMarker(evt);
		});
	}

	// checking whose turn it is
	if ( $(info).text() === 'Their turn!' ) {
		$(info).removeClass('warning').addClass('.info');
		$(info).text('Your turn!');
	}
}

function placeMarker (event) {
	var target = event.target, turnNum = 0;

	for ( i = 0; i < board.length; i++ ) {
		if ( board[i] != 0 ) {
			turnNum += 1;
		}
	}

	if (  ( turnNum%2 === 0 ) && boardStatus.o === userRef.name() ) {
		target.value = 'O';
	} else if ( ( turnNum%2 !== 0 ) && boardStatus.o !== userRef.name() ) {
		target.value = 'X';
	} else {
		$('.info').addClass('warning').text('Their turn!');
	}

	if (board[target.id] == 0  && target.value) {
		boardRef.child('board').child(target.id).set(target.value);
	}

	checkForWins();
}

function checkForWins() {
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
		$('.info').addClass('winner').text(winner + ' is the winner!');
		boardRef.child('winner').set(winner);
	}

	if (_this.turnNum == 8 && !winner) {
		$('.info').addClass('winner').text('Cats game!');
	} else if ( _this.turnNum == 9 && !winner ) {
		// set back to zero so the game can restart
		_this.turnNum = 0
	}
}


auth.login('facebook');

