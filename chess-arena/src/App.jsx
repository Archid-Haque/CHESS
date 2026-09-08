import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

const API_URL = "http://localhost:5000";

function App() {
  // ==================================================
  // CHESS STATE
  // ==================================================

  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);

  const [showSettings, setShowSettings] = useState(false);
  const [showLegalMoves, setShowLegalMoves] = useState(true);

  const [connected, setConnected] = useState(false);

  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);

  // ==================================================
  // AUTHENTICATION
  // ==================================================

  const [user, setUser] = useState(null);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signin");

  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authFromGame, setAuthFromGame] = useState(false);

  // ==================================================
  // ONLINE GAME
  // ==================================================

  const [showPlayLobby, setShowPlayLobby] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [roomInput, setRoomInput] = useState("");

  const [playerColor, setPlayerColor] = useState(null);

  const [gameStatus, setGameStatus] = useState("idle");

  const [lobbyError, setLobbyError] = useState("");

  // ==================================================
  // CHECK EXISTING LOGIN SESSION
  // ==================================================

  useEffect(() => {
    const checkLoggedInUser = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setUser(data.user);
        }
      } catch (error) {
        console.log(
          "No active authentication session."
        );
      }
    };

    checkLoggedInUser();
  }, []);

  // ==================================================
  // SOCKET CONNECTION
  // ==================================================

  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "Connected to ChessArena server:",
        socket.id
      );

      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log(
        "Disconnected from ChessArena server"
      );

      setConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, []);

  // ==================================================
  // ONLINE GAME SOCKET EVENTS
  // ==================================================

  useEffect(() => {
    // Opponent joined and game started
    const handleGameStarted = ({
      roomId: startedRoomId,
      fen,
    }) => {
      console.log(
        "Game started:",
        startedRoomId
      );

      setRoomId(startedRoomId);
      setGame(new Chess(fen));
      setGameStatus("playing");
      setShowPlayLobby(false);
      setLobbyError("");

      setSelectedSquare(null);
      setLegalMoves([]);
    };

    // Opponent disconnected
    const handleOpponentDisconnected = () => {
      console.log(
        "Opponent disconnected"
      );

      setGameStatus("opponent-disconnected");
    };

    // Opponent left normally
    const handleOpponentLeft = () => {
      console.log(
        "Opponent left the game"
      );

      setGameStatus("opponent-left");
    };

    socket.on(
      "game-started",
      handleGameStarted
    );

    socket.on(
      "opponent-disconnected",
      handleOpponentDisconnected
    );

    socket.on(
      "opponent-left",
      handleOpponentLeft
    );

    return () => {
      socket.off(
        "game-started",
        handleGameStarted
      );

      socket.off(
        "opponent-disconnected",
        handleOpponentDisconnected
      );

      socket.off(
        "opponent-left",
        handleOpponentLeft
      );
    };
  }, []);

  // ==================================================
  // OPPONENT MOVE
  // ==================================================

  useEffect(() => {
    const handleOpponentMove = ({
      fen,
    }) => {
      console.log(
        "Opponent moved"
      );

      setGame(new Chess(fen));

      setSelectedSquare(null);
      setLegalMoves([]);
    };

    socket.on(
      "opponent-move",
      handleOpponentMove
    );

    return () => {
      socket.off(
        "opponent-move",
        handleOpponentMove
      );
    };
  }, []);

  // ==================================================
  // GAME STATE
  // ==================================================

  useEffect(() => {
    const handleGameState = ({
      fen,
      gameOver,
      checkmate,
      draw,
    }) => {
      setGame(new Chess(fen));

      setSelectedSquare(null);
      setLegalMoves([]);

      if (gameOver) {
        if (checkmate) {
          setGameStatus("checkmate");
        } else if (draw) {
          setGameStatus("draw");
        }
      }
    };

    socket.on(
      "game-state",
      handleGameState
    );

    return () => {
      socket.off(
        "game-state",
        handleGameState
      );
    };
  }, []);

  // ==================================================
  // GAME OVER
  // ==================================================

  useEffect(() => {
    const handleGameOver = ({
      result,
      checkmate,
      draw,
    }) => {
      console.log(
        "Game over:",
        result
      );

      if (checkmate) {
        setGameStatus("checkmate");
      } else if (draw) {
        setGameStatus("draw");
      }
    };

    socket.on(
      "game-over",
      handleGameOver
    );

    return () => {
      socket.off(
        "game-over",
        handleGameOver
      );
    };
  }, []);

  // ==================================================
  // RESIGN RESULT
  // ==================================================

  useEffect(() => {
    const handleGameResigned = ({
      resignedBy,
      winner,
    }) => {
      console.log(
        "Game resigned:",
        resignedBy,
        winner
      );

      setGameStatus("resigned");
    };

    socket.on(
      "game-resigned",
      handleGameResigned
    );

    return () => {
      socket.off(
        "game-resigned",
        handleGameResigned
      );
    };
  }, []);

  // ==================================================
  // AUTH
  // ==================================================

  const openSignIn = (fromGame = false) => {
    setAuthMode("signin");
    setShowPassword(false);
    setAuthError("");
    setAuthFromGame(fromGame);
    setShowAuth(true);
  };

  const openSignUp = () => {
    setAuthMode("signup");
    setShowPassword(false);
    setAuthError("");
    setAuthFromGame(false);
    setShowAuth(true);
  };

  const closeAuth = () => {
    if (authLoading) {
      return;
    }

    setShowAuth(false);
    setShowPassword(false);
    setAuthError("");
    setAuthFromGame(false);
  };

  // ==================================================
  // AUTH SUBMIT
  // ==================================================

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");

    const formData = new FormData(
      event.currentTarget
    );

    const username =
      formData.get("username");

    const email =
      formData.get("email");

    const password =
      formData.get("password");

    try {
      const endpoint =
        authMode === "signin"
          ? `${API_URL}/api/auth/login`
          : `${API_URL}/api/auth/register`;

      const body =
        authMode === "signin"
          ? {
              email,
              password,
            }
          : {
              username,
              email,
              password,
            };

      const response = await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials: "include",

          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setAuthError(
          data.message ||
            "Authentication failed."
        );

        return;
      }

      setUser(data.user);

      setShowAuth(false);
      setShowPassword(false);
      setAuthError("");
      setAuthFromGame(false);

      console.log(
        "Authenticated user:",
        data.user
      );
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      setAuthError(
        "Could not connect to ChessArena server."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        setUser(null);

        setSelectedSquare(null);
        setLegalMoves([]);

        setShowPlayLobby(false);
        setGameStatus("idle");
        setRoomId("");
        setPlayerColor(null);
      }
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };

  // ==================================================
  // OPEN PLAY LOBBY
  // ==================================================

  const openPlayLobby = () => {
    if (!user) {
      openSignIn(true);
      return;
    }

    setLobbyError("");
    setRoomInput("");
    setGameStatus("idle");
    setShowPlayLobby(true);
  };

  // ==================================================
  // CLOSE PLAY LOBBY
  // ==================================================

  const closePlayLobby = () => {
    if (
      gameStatus === "waiting"
    ) {
      socket.emit("leave-room");
    }

    setShowPlayLobby(false);
    setLobbyError("");
    setRoomInput("");
    setGameStatus("idle");
    setRoomId("");
    setPlayerColor(null);
  };

  // ==================================================
  // CREATE ONLINE GAME
  // ==================================================

  const createOnlineGame = () => {
    if (!user) {
      openSignIn(true);
      return;
    }

    setLobbyError("");
    setGameStatus("waiting");

    socket.emit(
      "create-room",
      (response) => {
        if (!response.success) {
          setGameStatus("idle");

          setLobbyError(
            response.message ||
              "Could not create game."
          );

          return;
        }

        setRoomId(
          response.roomId
        );

        setPlayerColor(
          response.color
        );

        setGame(
          new Chess(
            response.fen
          )
        );

        console.log(
          "Created room:",
          response.roomId
        );
      }
    );
  };

  // ==================================================
  // JOIN ONLINE GAME
  // ==================================================

  const joinOnlineGame = () => {
    if (!user) {
      openSignIn(true);
      return;
    }

    const cleanCode =
      roomInput
        .trim()
        .toUpperCase();

    if (!cleanCode) {
      setLobbyError(
        "Please enter a game code."
      );

      return;
    }

    setLobbyError("");

    socket.emit(
      "join-room",
      {
        roomId: cleanCode,
      },
      (response) => {
        if (!response.success) {
          setLobbyError(
            response.message ||
              "Could not join game."
          );

          return;
        }

        setRoomId(
          response.roomId
        );

        setPlayerColor(
          response.color
        );

        setGame(
          new Chess(
            response.fen
          )
        );

        setGameStatus(
          "playing"
        );

        setShowPlayLobby(
          false
        );

        console.log(
          "Joined room:",
          response.roomId
        );
      }
    );
  };

  // ==================================================
  // COPY GAME CODE
  // ==================================================

  const copyRoomCode = async () => {
    if (!roomId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        roomId
      );

      console.log(
        "Game code copied"
      );
    } catch (error) {
      console.log(
        "Could not copy code"
      );
    }
  };

  // ==================================================
  // SHOW LEGAL MOVES
  // ==================================================

  const selectSquare = (square) => {
    if (!user) {
      openSignIn(true);
      return;
    }

    // If playing online, only allow your color
    if (
      gameStatus === "playing" &&
      playerColor
    ) {
      const currentTurn =
        game.turn() === "w"
          ? "white"
          : "black";

      if (
        currentTurn !==
        playerColor
      ) {
        return;
      }
    }

    if (!showLegalMoves) {
      return;
    }

    const piece =
      game.get(square);

    if (!piece) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }

    if (
      piece.color !==
      game.turn()
    ) {
      return;
    }

    const moves =
      game.moves({
        square,
        verbose: true,
      });

    setSelectedSquare(square);
    setLegalMoves(moves);
  };

  // ==================================================
  // MAKE MOVE
  // ==================================================

  const makeMove = ({
    sourceSquare,
    targetSquare,
  }) => {
    if (!user) {
      openSignIn(true);
      return false;
    }

    // ==================================================
    // ONLINE GAME
    // ==================================================

    if (
      gameStatus === "playing" &&
      roomId
    ) {
      const currentTurn =
        game.turn() === "w"
          ? "white"
          : "black";

      // Not your turn
      if (
        currentTurn !==
        playerColor
      ) {
        return false;
      }

      // Validate locally first
      const gameCopy =
        new Chess(
          game.fen()
        );

      try {
        const move =
          gameCopy.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
          });

        if (!move) {
          return false;
        }

        // Server validates the actual move.
        socket.emit(
          "make-move",
          {
            roomId,
            from: sourceSquare,
            to: targetSquare,
            promotion: "q",
          },
          (response) => {
            if (
              !response ||
              !response.success
            ) {
              console.log(
                "Server rejected move:",
                response?.message
              );

              return;
            }

            setGame(
              new Chess(
                response.fen
              )
            );

            setSelectedSquare(null);
            setLegalMoves([]);
          }
        );

        return true;
      } catch (error) {
        console.log(
          "Illegal move:",
          error
        );

        return false;
      }
    }

    // ==================================================
    // LOCAL GAME
    // ==================================================

    const gameCopy =
      new Chess(
        game.fen()
      );

    try {
      const move =
        gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: "q",
        });

      if (!move) {
        return false;
      }

      setHistory(
        (previousHistory) => [
          ...previousHistory,
          game.fen(),
        ]
      );

      setGame(gameCopy);

      setSelectedSquare(null);
      setLegalMoves([]);

      return true;
    } catch (error) {
      console.log(
        "Illegal move:",
        error
      );

      return false;
    }
  };

  // ==================================================
  // NEW LOCAL GAME
  // ==================================================

  const resetGame = () => {
    if (!user) {
      openSignIn(true);
      return;
    }

    if (roomId) {
      return;
    }

    setGame(new Chess());
    setHistory([]);

    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // ==================================================
  // UNDO
  // ==================================================

  const undoMove = () => {
    if (!user) {
      openSignIn(true);
      return;
    }

    // Undo isn't available online yet
    if (roomId) {
      return;
    }

    if (history.length === 0) {
      return;
    }

    const previousPosition =
      history[
        history.length - 1
      ];

    setGame(
      new Chess(
        previousPosition
      )
    );

    setHistory(
      (previousHistory) =>
        previousHistory.slice(
          0,
          -1
        )
    );

    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // ==================================================
  // RESIGN
  // ==================================================

  const resignGame = () => {
    if (!roomId) {
      return;
    }

    socket.emit(
      "resign-game",
      {
        roomId,
      }
    );

    setGameStatus(
      "resigned"
    );
  };

  // ==================================================
  // LEAVE ONLINE GAME
  // ==================================================

  const leaveOnlineGame = () => {
    socket.emit(
      "leave-room"
    );

    setRoomId("");
    setPlayerColor(null);
    setGameStatus("idle");

    setGame(new Chess());

    setSelectedSquare(null);
    setLegalMoves([]);
  };

  // ==================================================
  // LEGAL MOVE HIGHLIGHTS
  // ==================================================

  const squareStyles = {};

  if (
    showLegalMoves &&
    selectedSquare &&
    user
  ) {
    squareStyles[
      selectedSquare
    ] = {
      boxShadow:
        "inset 0 0 0 4px rgba(190, 255, 50, 0.75)",
    };

    legalMoves.forEach(
      (move) => {
        const targetSquare =
          move.to;

        if (move.captured) {
          squareStyles[
            targetSquare
          ] = {
            boxShadow:
              "inset 0 0 0 5px rgba(190, 255, 50, 0.65)",
          };
        } else {
          squareStyles[
            targetSquare
          ] = {
            background:
              "radial-gradient(circle, rgba(190, 255, 50, 0.85) 0%, rgba(190, 255, 50, 0.85) 16%, transparent 18%)",
          };
        }
      }
    );
  }

  // ==================================================
  // NAVIGATION
  // ==================================================

  const scrollToGame = () => {
    document
      .querySelector(
        ".game-section"
      )
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  const handleLearn = () => {
    alert(
      "Chess lessons are coming soon! ♟️"
    );
  };

  const handleTournaments =
    () => {
      alert(
        "Tournaments are coming soon! 🏆"
      );
    };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="app">

      {/* ==================================================
          NAVBAR
          ================================================== */}

      <header className="navbar">

        <div className="brand">

          <div className="brand-icon">
            ♞
          </div>

          <span>
            ChessArena
          </span>

        </div>

        <nav>

          <button
            onClick={
              openPlayLobby
            }
          >
            Play
          </button>

          <button
            onClick={
              handleLearn
            }
          >
            Learn
          </button>

          <button
            onClick={
              handleTournaments
            }
          >
            Tournaments
          </button>

        </nav>

        {/* ==================================================
            USER
            ================================================== */}

        {user ? (

          <div className="user-menu">

            <div className="user-info">

              <div className="user-avatar">
                {user.username
                  ?.charAt(0)
                  .toUpperCase()}
              </div>

              <div className="user-details">

                <strong>
                  {user.username}
                </strong>

                <span>
                  Rating{" "}
                  {user.rating}
                </span>

              </div>

            </div>

            <button
              className="login-btn"
              onClick={
                handleLogout
              }
            >
              Logout
            </button>

          </div>

        ) : (

          <button
            className="login-btn"
            onClick={() =>
              openSignIn(false)
            }
          >
            Sign In
          </button>

        )}

      </header>

      {/* ==================================================
          MAIN
          ================================================== */}

      <main className="main-content">

        {/* HERO */}

        <section className="hero">

          <p className="eyebrow">
            THE NEXT MOVE IS YOURS
          </p>

          <h1>
            Play. Learn.
            <br />

            <span>
              Become better.
            </span>
          </h1>

          <p className="subtitle">
            A modern chess experience
            built for players who want
            to compete, learn and improve.
          </p>

          <div className="connection-status">

            <span
              className={`status-dot ${
                connected
                  ? "online"
                  : "offline"
              }`}
            />

            {connected
              ? "Connected to ChessArena"
              : "Connecting to ChessArena..."}

          </div>

        </section>

        {/* ==================================================
            GAME
            ================================================== */}

        <section className="game-section">

          {/* PLAYER CARD */}

          <div className="player-card">

            <div className="avatar">

              {user
                ? user.username
                    ?.charAt(0)
                    .toUpperCase()
                : "♟"}

            </div>

            <div>

              <strong>
                {user
                  ? user.username
                  : "You"}
              </strong>

              <span>
                Rating{" "}
                {user
                  ? user.rating
                  : 1200}
              </span>

            </div>

            <div className="captured">
              ♟ ♟ ♟
            </div>

          </div>

          {/* ONLINE GAME INFO */}

          {roomId && (

            <div className="online-game-bar">

              <div>

                <span>
                  Game
                </span>

                <strong>
                  {roomId}
                </strong>

              </div>

              <div>

                <span>
                  Playing as
                </span>

                <strong>
                  {playerColor}
                </strong>

              </div>

              {gameStatus ===
                "playing" && (

                <div>

                  <span>
                    Turn
                  </span>

                  <strong>
                    {game.turn() ===
                    "w"
                      ? "White"
                      : "Black"}
                  </strong>

                </div>

              )}

            </div>

          )}

          {/* CHESSBOARD */}

          <div className="board-wrapper">

            <Chessboard
              options={{
                position:
                  game.fen(),

                onPieceDrop: ({
                  sourceSquare,
                  targetSquare,
                }) =>
                  makeMove({
                    sourceSquare,
                    targetSquare,
                  }),

                onSquareClick: ({
                  square,
                }) => {
                  selectSquare(
                    square
                  );
                },

                squareStyles:
                  squareStyles,

                boardWidth:
                  Math.min(
                    600,
                    window.innerWidth -
                      40
                  ),

                boardStyle: {
                  borderRadius:
                    "12px",

                  overflow:
                    "hidden",

                  boxShadow:
                    "0 20px 60px rgba(0,0,0,0.35)",
                },
              }}
            />

          </div>

          {/* ==================================================
              GAME STATUS
              ================================================== */}

          {roomId &&
            gameStatus ===
              "waiting" && (

              <div className="game-status-card">

                <span className="waiting-dot" />

                <div>

                  <strong>
                    Waiting for opponent
                  </strong>

                  <span>
                    Share your game code
                    with another player.
                  </span>

                </div>

              </div>

            )}

          {roomId &&
            gameStatus ===
              "opponent-disconnected" && (

              <div className="game-status-card">

                <div>

                  <strong>
                    Opponent disconnected
                  </strong>

                  <span>
                    Waiting for them to
                    reconnect.
                  </span>

                </div>

              </div>

            )}

          {roomId &&
            gameStatus ===
              "opponent-left" && (

              <div className="game-status-card">

                <div>

                  <strong>
                    Opponent left
                  </strong>

                  <span>
                    This game has ended.
                  </span>

                </div>

              </div>

            )}

          {roomId &&
            gameStatus ===
              "checkmate" && (

              <div className="game-status-card">

                <div>

                  <strong>
                    Checkmate
                  </strong>

                  <span>
                    Game over.
                  </span>

                </div>

              </div>

            )}

          {roomId &&
            gameStatus ===
              "draw" && (

              <div className="game-status-card">

                <div>

                  <strong>
                    Draw
                  </strong>

                  <span>
                    The game ended in a draw.
                  </span>

                </div>

              </div>

            )}

          {/* ==================================================
              CONTROLS
              ================================================== */}

          <div className="game-controls">

            {!roomId ? (

              <>
                <button
                  className="control-btn"
                  onClick={
                    resetGame
                  }
                >
                  New Game
                </button>

                <button
                  className="control-btn secondary"
                  onClick={
                    undoMove
                  }
                  disabled={
                    history.length ===
                      0 ||
                    !user
                  }
                >
                  ↶ Undo
                </button>
              </>

            ) : (

              <>
                {gameStatus ===
                  "playing" && (

                  <button
                    className="control-btn secondary"
                    onClick={
                      resignGame
                    }
                  >
                    Resign
                  </button>

                )}

                <button
                  className="control-btn secondary"
                  onClick={
                    leaveOnlineGame
                  }
                >
                  Leave Game
                </button>
              </>

            )}

            <button
              className="control-btn secondary"
              onClick={() =>
                setShowSettings(
                  !showSettings
                )
              }
            >
              ⚙ Settings
            </button>

          </div>

          {/* ==================================================
              SETTINGS
              ================================================== */}

          {showSettings && (

            <div className="settings-panel">

              <h3>
                Game Settings
              </h3>

              <p>
                Customize your
                ChessArena experience.
              </p>

              <div className="setting-row">

                <div className="setting-info">

                  <strong>
                    Show Legal Moves
                  </strong>

                  <span>
                    Highlight possible
                    moves when you
                    select a piece.
                  </span>

                </div>

                <button
                  className={`toggle ${
                    showLegalMoves
                      ? "active"
                      : ""
                  }`}
                  onClick={
                    toggleLegalMoves
                  }
                  aria-label="Toggle legal move hints"
                >
                  <span />
                </button>

              </div>

              <button
                className="control-btn"
                onClick={() =>
                  setShowSettings(
                    false
                  )
                }
              >
                Done
              </button>

            </div>

          )}

        </section>

      </main>

      {/* ==================================================
          PLAY ONLINE LOBBY
          ================================================== */}

      {showPlayLobby && (

        <div
          className="auth-overlay"
          onClick={
            closePlayLobby
          }
        >

          <div
            className="auth-modal play-lobby"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* CLOSE */}

            <button
              className="auth-close"
              onClick={
                closePlayLobby
              }
            >
              ×
            </button>

            {/* LOGO */}

            <div className="auth-logo">
              ♞
            </div>

            <h2>
              Play Online
            </h2>

            <p className="auth-subtitle">
              Challenge another player
              and play in real time.
            </p>

            {/* ==================================================
                WAITING FOR OPPONENT
                ================================================== */}

            {gameStatus ===
              "waiting" ? (

              <div className="waiting-room">

                <div className="room-label">
                  GAME CODE
                </div>

                <div className="room-code">
                  {roomId}
                </div>

                <p>
                  Share this code with
                  your opponent.
                </p>

                <button
                  className="auth-submit"
                  onClick={
                    copyRoomCode
                  }
                >
                  Copy Game Code
                </button>

                <div className="waiting-message">

                  <span className="waiting-dot" />

                  Waiting for opponent...

                </div>

              </div>

            ) : (

              <>
                {/* ==================================================
                    CREATE GAME
                    ================================================== */}

                <button
                  className="online-action-btn"
                  onClick={
                    createOnlineGame
                  }
                >

                  <span className="action-icon">
                    ⚡
                  </span>

                  <span>

                    <strong>
                      Create Game
                    </strong>

                    <small>
                      Create a room and
                      invite a friend.
                    </small>

                  </span>

                </button>

                {/* DIVIDER */}

                <div className="auth-divider">

                  <span>
                    OR
                  </span>

                </div>

                {/* ==================================================
                    JOIN GAME
                    ================================================== */}

                <div className="input-group">

                  <label>
                    Game Code
                  </label>

                  <input
                    type="text"
                    value={
                      roomInput
                    }
                    onChange={(
                      event
                    ) =>
                      setRoomInput(
                        event.target
                          .value
                          .toUpperCase()
                          .slice(0, 6)
                      )
                    }
                    placeholder="ABC123"
                    maxLength={6}
                  />

                </div>

                {lobbyError && (

                  <div className="auth-error">
                    {lobbyError}
                  </div>

                )}

                <button
                  className="auth-submit"
                  onClick={
                    joinOnlineGame
                  }
                >
                  Join Game
                </button>

              </>

            )}

          </div>

        </div>

      )}

      {/* ==================================================
          AUTH MODAL
          ================================================== */}

      {showAuth && (

        <div
          className="auth-overlay"
          onClick={
            closeAuth
          }
        >

          <div
            className="auth-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="auth-close"
              onClick={
                closeAuth
              }
            >
              ×
            </button>

            <div className="auth-logo">
              ♞
            </div>

            <h2>

              {authFromGame
                ? "Sign in to play"
                : authMode ===
                  "signin"
                ? "Welcome back"
                : "Create your account"}

            </h2>

            <p className="auth-subtitle">

              {authFromGame
                ? "Sign in to continue playing chess on ChessArena."
                : authMode ===
                  "signin"
                ? "Sign in to continue your chess journey."
                : "Join ChessArena and start your journey."}

            </p>

            {authError && (

              <div className="auth-error">
                {authError}
              </div>

            )}

            <form
              onSubmit={
                handleAuthSubmit
              }
              className="auth-form"
            >

              {authMode ===
                "signup" && (

                <div className="input-group">

                  <label>
                    Username
                  </label>

                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    minLength={3}
                    maxLength={20}
                    required
                  />

                </div>

              )}

              <div className="input-group">

                <label>
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  required
                />

              </div>

              <div className="input-group">

                <label>
                  Password
                </label>

                <div className="password-wrapper">

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    name="password"
                    placeholder="Enter your password"
                    minLength={6}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                  >
                    {showPassword
                      ? "Hide"
                      : "Show"}
                  </button>

                </div>

              </div>

              {authMode ===
                "signin" && (

                <div className="auth-options">

                  <label className="remember-me">

                    <input
                      type="checkbox"
                    />

                    <span>
                      Remember me
                    </span>

                  </label>

                  <button
                    type="button"
                    className="forgot-password"
                    onClick={() =>
                      alert(
                        "Password reset coming soon!"
                      )
                    }
                  >
                    Forgot password?
                  </button>

                </div>

              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={
                  authLoading
                }
              >
                {authLoading
                  ? "Please wait..."
                  : authMode ===
                    "signin"
                  ? "Sign In"
                  : "Create Account"}
              </button>

            </form>

            <div className="auth-divider">

              <span>
                OR
              </span>

            </div>

            <button
              className="google-btn"
              onClick={() =>
                alert(
                  "Google authentication coming next! 🔐"
                )
              }
            >

              <span className="google-icon">
                G
              </span>

              Continue with Google

            </button>

            <p className="auth-switch">

              {authMode ===
              "signin"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={() => {

                  if (
                    authMode ===
                    "signin"
                  ) {
                    openSignUp();
                  } else {
                    openSignIn(
                      authFromGame
                    );
                  }

                }}
              >

                {authMode ===
                "signin"
                  ? "Create account"
                  : "Sign in"}

              </button>

            </p>

          </div>

        </div>

      )}

    </div>
  );
}

export default App;