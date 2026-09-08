require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { Chess } = require("chess.js");

const User = require("./models/User");

const app = express();
const server = http.createServer(app);

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ==================================================
// MONGODB
// ==================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("MongoDB connection failed:");
    console.error(error.message);
  });

// ==================================================
// SOCKET.IO
// ==================================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// ==================================================
// BASIC ROUTE
// ==================================================

app.get("/", (req, res) => {
  res.json({
    message: "ChessArena server is running ♟️",
  });
});

// ==================================================
// AUTHENTICATION
// ==================================================

const createToken = (userId) => {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

// ==================================================
// REGISTER
// ==================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      username,
      email,
      password,
    } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Username, email and password are required.",
      });
    }

    const cleanUsername = username.trim();
    const normalizedEmail =
      email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({
        success: false,
        message:
          "Username must be at least 3 characters.",
      });
    }

    if (cleanUsername.length > 20) {
      return res.status(400).json({
        success: false,
        message:
          "Username cannot exceed 20 characters.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters.",
      });
    }

    const existingUser = await User.findOne({
      $or: [
        {
          email: normalizedEmail,
        },
        {
          username: cleanUsername,
        },
      ],
    });

    if (existingUser) {
      if (
        existingUser.email ===
        normalizedEmail
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this email already exists.",
        });
      }

      return res.status(409).json({
        success: false,
        message:
          "That username is already taken.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const user = await User.create({
      username: cleanUsername,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge:
        7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message:
        "Account created successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
      },
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while creating your account.",
    });
  }
});

// ==================================================
// LOGIN
// ==================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const passwordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid email or password.",
      });
    }

    const token = createToken(user._id);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge:
        7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message:
        "Signed in successfully.",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        rating: user.rating,
        gamesPlayed: user.gamesPlayed,
        gamesWon: user.gamesWon,
        gamesLost: user.gamesLost,
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Something went wrong while signing in.",
    });
  }
});

// ==================================================
// AUTH MIDDLEWARE
// ==================================================

const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.userId
    ).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired session.",
    });
  }
};

// ==================================================
// CURRENT USER
// ==================================================

app.get(
  "/api/auth/me",
  authenticate,
  (req, res) => {
    res.json({
      success: true,
      user: req.user,
    });
  }
);

// ==================================================
// LOGOUT
// ==================================================

app.post(
  "/api/auth/logout",
  (req, res) => {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.json({
      success: true,
      message:
        "Logged out successfully.",
    });
  }
);

// ==================================================
// CHESS ROOMS
// ==================================================

const rooms = new Map();

// Room structure:
//
// {
//   players: [
//     {
//       socketId,
//       color
//     }
//   ],
//   game: Chess instance,
//   status: "waiting" | "playing" | "finished"
// }

// ==================================================
// GENERATE ROOM CODE
// ==================================================

const generateRoomId = () => {
  let roomId;

  do {
    roomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
  } while (rooms.has(roomId));

  return roomId;
};

// ==================================================
// SOCKET CONNECTION
// ==================================================

io.on("connection", (socket) => {
  console.log(
    `Player connected: ${socket.id}`
  );

  // ==================================================
  // CREATE ROOM
  // ==================================================

  socket.on(
    "create-room",
    (callback) => {
      const roomId =
        generateRoomId();

      const game = new Chess();

      rooms.set(roomId, {
        players: [
          {
            socketId: socket.id,
            color: "white",
          },
        ],

        game,

        status: "waiting",
      });

      socket.join(roomId);

      socket.data.roomId = roomId;
      socket.data.color = "white";

      callback({
        success: true,
        roomId,
        color: "white",
        status: "waiting",
        fen: game.fen(),
      });

      console.log(
        `Room ${roomId} created by ${socket.id}`
      );
    }
  );

  // ==================================================
  // JOIN ROOM
  // ==================================================

  socket.on(
    "join-room",
    ({ roomId }, callback) => {
      if (!roomId) {
        callback({
          success: false,
          message:
            "Please enter a game code.",
        });

        return;
      }

      const cleanRoomId =
        roomId.trim().toUpperCase();

      const room =
        rooms.get(cleanRoomId);

      if (!room) {
        callback({
          success: false,
          message:
            "Game not found. Check the code and try again.",
        });

        return;
      }

      if (room.players.length >= 2) {
        callback({
          success: false,
          message:
            "This game is already full.",
        });

        return;
      }

      room.players.push({
        socketId: socket.id,
        color: "black",
      });

      room.status = "playing";

      socket.join(cleanRoomId);

      socket.data.roomId =
        cleanRoomId;

      socket.data.color = "black";

      callback({
        success: true,
        roomId: cleanRoomId,
        color: "black",
        status: "playing",
        fen: room.game.fen(),
      });

      // Tell both players
      io.to(cleanRoomId).emit(
        "game-started",
        {
          roomId: cleanRoomId,
          fen: room.game.fen(),
        }
      );

      console.log(
        `${socket.id} joined room ${cleanRoomId} as black`
      );
    }
  );

  // ==================================================
  // MAKE MOVE
  // ==================================================

  socket.on(
    "make-move",
    ({ roomId, from, to, promotion }, callback) => {
      const room =
        rooms.get(roomId);

      if (!room) {
        callback?.({
          success: false,
          message:
            "Game room no longer exists.",
        });

        return;
      }

      if (room.status !== "playing") {
        callback?.({
          success: false,
          message:
            "The game has not started.",
        });

        return;
      }

      // Find this player's color
      const player = room.players.find(
        (item) =>
          item.socketId === socket.id
      );

      if (!player) {
        callback?.({
          success: false,
          message:
            "You are not part of this game.",
        });

        return;
      }

      // Make sure player is moving their color
      if (
        room.game.turn() !==
        player.color.charAt(0)
      ) {
        callback?.({
          success: false,
          message:
            "It is not your turn.",
        });

        return;
      }

      try {
        const move = room.game.move({
          from,
          to,
          promotion: promotion || "q",
        });

        if (!move) {
          callback?.({
            success: false,
            message:
              "Illegal move.",
          });

          return;
        }

        const newFen =
          room.game.fen();

        const gameOver =
          room.game.isGameOver();

        const checkmate =
          room.game.isCheckmate();

        const draw =
          room.game.isDraw();

        // Confirm to mover
        callback?.({
          success: true,
          move,
          fen: newFen,
        });

        // Send move to opponent
        socket
          .to(roomId)
          .emit("opponent-move", {
            move,
            fen: newFen,
          });

        // Send game state to everyone
        io.to(roomId).emit(
          "game-state",
          {
            fen: newFen,
            turn:
              room.game.turn(),
            gameOver,
            checkmate,
            draw,
          }
        );

        console.log(
          `Move in ${roomId}: ${from} → ${to}`
        );

        // ==================================================
        // GAME OVER
        // ==================================================

        if (gameOver) {
          room.status = "finished";

          let result = "draw";

          if (checkmate) {
            // The player who just moved wins
            result =
              player.color ===
              "white"
                ? "white"
                : "black";
          }

          io.to(roomId).emit(
            "game-over",
            {
              result,
              checkmate,
              draw,
            }
          );

          console.log(
            `Game ${roomId} finished: ${result}`
          );
        }
      } catch (error) {
        console.error(
          "Move validation error:",
          error
        );

        callback?.({
          success: false,
          message:
            "Invalid chess move.",
        });
      }
    }
  );

  // ==================================================
  // RESIGN
  // ==================================================

  socket.on(
    "resign-game",
    ({ roomId }) => {
      const room =
        rooms.get(roomId);

      if (!room) {
        return;
      }

      const player =
        room.players.find(
          (item) =>
            item.socketId ===
            socket.id
        );

      if (!player) {
        return;
      }

      room.status = "finished";

      const winner =
        player.color ===
        "white"
          ? "black"
          : "white";

      io.to(roomId).emit(
        "game-resigned",
        {
          resignedBy:
            player.color,
          winner,
        }
      );

      console.log(
        `${player.color} resigned in ${roomId}`
      );
    }
  );

  // ==================================================
  // LEAVE ROOM
  // ==================================================

  socket.on(
    "leave-room",
    () => {
      const roomId =
        socket.data.roomId;

      if (!roomId) {
        return;
      }

      const room =
        rooms.get(roomId);

      if (!room) {
        return;
      }

      socket.leave(roomId);

      room.players =
        room.players.filter(
          (player) =>
            player.socketId !==
            socket.id
        );

      io.to(roomId).emit(
        "opponent-left"
      );

      socket.data.roomId = null;
      socket.data.color = null;

      if (
        room.players.length === 0
      ) {
        rooms.delete(roomId);

        console.log(
          `Room ${roomId} deleted`
        );
      }
    }
  );

  // ==================================================
  // DISCONNECT
  // ==================================================

  socket.on(
    "disconnect",
    () => {
      console.log(
        `Player disconnected: ${socket.id}`
      );

      const roomId =
        socket.data.roomId;

      if (!roomId) {
        return;
      }

      const room =
        rooms.get(roomId);

      if (!room) {
        return;
      }

      room.players =
        room.players.filter(
          (player) =>
            player.socketId !==
            socket.id
        );

      // Tell opponent
      io.to(roomId).emit(
        "opponent-disconnected"
      );

      if (
        room.players.length === 0
      ) {
        rooms.delete(roomId);

        console.log(
          `Room ${roomId} deleted after disconnect`
        );
      } else {
        room.status = "waiting";

        console.log(
          `Player left room ${roomId}`
        );
      }
    }
  );
});

// ==================================================
// START SERVER
// ==================================================

const PORT =
  process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `ChessArena server running on port ${PORT}`
  );
});