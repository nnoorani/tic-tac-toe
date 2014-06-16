Tetris.PlayingState = { Watching: 0, Joining: 1, Playing: 2 };
  Tetris.Controller = function (tetrisRef) {
    this.tetrisRef = tetrisRef;
    this.createBoards();

    this.playingState = Tetris.PlayingState.Watching;
    this.waitToJoin();
  };


  Tetris.Controller.prototype.createBoards = function () {
    this.boards = [];
    for(var i = 0; i <= 1; i++) {
      var playerRef = this.tetrisRef.child('player' + i);
      var canvas = $('#canvas' + i).get(0);
      this.boards.push(new Tetris.Board(canvas, playerRef));
    }
  };


  Tetris.Controller.prototype.waitToJoin = function() {
    var self = this;

    // Listen on 'online' location for player0 and player1.
    this.tetrisRef.child('player0/online').on('value', function(onlineSnap) {
      if (onlineSnap.val() === null && self.playingState === Tetris.PlayingState.Watching) {
        self.tryToJoin(0);
      }
    });

    this.tetrisRef.child('player1/online').on('value', function(onlineSnap) {
      if (onlineSnap.val() === null && self.playingState === Tetris.PlayingState.Watching) {
        self.tryToJoin(1);
      }
    });
  };


  /**
   * Try to join the game as the specified playerNum.
   */
  Tetris.Controller.prototype.tryToJoin = function(playerNum) {
    // Set ourselves as joining to make sure we don't try to join as both players. :-)
    this.playingState = Tetris.PlayingState.Joining;

    // Use a transaction to make sure we don't conflict with other people trying to join.
    var self = this;
    this.tetrisRef.child('player' + playerNum + '/online').transaction(function(onlineVal) {
      if (onlineVal === null) {
        return true; // Try to set online to true.
      } else {
        return; // Somebody must have beat us.  Abort the transaction.
      }
    }, function(error, committed) {
      if (committed) { // We got in!
        self.playingState = Tetris.PlayingState.Playing;
        self.startPlaying(playerNum);
      } else {
        self.playingState = Tetris.PlayingState.Watching;
      }
    });
  };


  /**
   * Once we've joined, enable controlling our player.
   */
  Tetris.Controller.prototype.startPlaying = function (playerNum) {
    this.myPlayerRef = this.tetrisRef.child('player' + playerNum);
    this.opponentPlayerRef = this.tetrisRef.child('player' + (1 - playerNum));
    this.myBoard = this.boards[playerNum];
    this.myBoard.isMyBoard = true;
    this.myBoard.draw();

    // Clear our 'online' status when we disconnect so somebody else can join.
    this.myPlayerRef.child('online').onDisconnect().remove();

    // Detect when other player pushes rows to our board.
    this.watchForExtraRows();

    // Detect when game is restarted by other player.
    this.watchForRestart();

    $('#gameInProgress').hide();

    var self = this;
    $('#restartButton').show();
    $("#restartButton").click(function () {
      self.restartGame();
    });

    this.initializePiece();
    this.enableKeyboard();
    this.resetGravity();
  };