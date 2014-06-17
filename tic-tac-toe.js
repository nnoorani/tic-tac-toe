var board = $('.board'),
canvas = $('.canvas'),
initialBoard = [0,0,0,0,0,0,0,0,0],
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
			&& (_user === undefined || _user === null || player != _user.id) //and its not me
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
	boardStatus = snapshot.val();
	var info = $('.info'), spots = 0;

	//just fill in the html board here
	for (i in boardStatus.board) {
		if (boardStatus.board[i] != 0 ) {
			$(canvas[i]).html(boardStatus.board[i]);
			spots++;
		}
		else $(canvas[i]).html('');
	}

	//lets set up the info text
	if (boardStatus.winner) {
		//if we already have a winner
		info.text(boardStatus.winner + ' is the winner, click to restart').click(restart)
	} else if (spots===9) {
		//if there's no winner but all nine spots are filled
		info.text('Tie Game, Click to Restart').click(restart)
	} else if (((spots%2 === 0) && boardStatus.o === userRef.name()) 
			|| ((spots%2 !== 0) && boardStatus.x === userRef.name())) {
		//its your turn
		info.text('Your turn!').removeClass('info').addClass('warning').off();
	} else {
		//its your opponents turn
		info.text('Their Turn').removeClass('warning').addClass('info').off();
	}
}

function restart() {
	//lets just make sure we have all our values first
	if (boardStatus === undefined || boardStatus === null
		|| _user === undefined || _user === null) return

	//figre out who's who
	if (userRef.name() === boardStatus.o) opponent = boardStatus.x;
	else opponent = boardStatus.o;

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

//set up click listeners for the board
canvas.on('mousedown', placeMarker);

//user clicked a box
function placeMarker (event) {
	var target = event.target, turnNum = 0;

	//did they click on a not empty box?
	if (boardStatus.board[target.id] !== 0) return;

	//does this board already have a winner
	if (boardStatus.winner) return;

	for (i in boardStatus.board)
		if (boardStatus.board[i] != 0 ) turnNum++;

	//if its an even turn and current user is o
	if ((turnNum%2 === 0) && boardStatus.o === userRef.name())
		target.value = 'O';

	//if it is an odd turn and the current user is x
	else if ((turnNum%2 !== 0) && boardStatus.x === userRef.name())
		target.value = 'X';

	//send it to firebase
	if (target.value) boardRef.child('board').child(target.id).set(target.value);

	//alright now check for winners
	checkForWins();
}

//check for wins every time someone places a thing
function checkForWins() {
	// all win possibilities (diagonals, columns, rows)
	var wins = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [6,4,2]], winner;

	//check for a XXX or OOO, always current user that wins
	for (k in wins) {
        var p = boardStatus.board[wins[k][0]] + boardStatus.board[wins[k][1]] + boardStatus.board[wins[k][2]];
        if (p == "XXX" || p == "OOO") winner = _user.displayName;
    }

    //Set the winner as the name of the current user
	if (winner) boardRef.child('winner').set(winner);
}


auth.login('facebook');

