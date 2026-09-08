import React, { useState } from "react";
import "./Learn.css";

const lessons = [
  {
    id: 1,
    icon: "♟",
    title: "The Chessboard",
    description: "Understand the 64 squares, ranks, files and board coordinates.",
    level: "Beginner",
  },
  {
    id: 2,
    icon: "♙",
    title: "The Pieces",
    description: "Learn how the king, queen, rook, bishop, knight and pawn move.",
    level: "Beginner",
  },
  {
    id: 3,
    icon: "♞",
    title: "Capturing Pieces",
    description: "Learn how pieces capture and why every capture matters.",
    level: "Beginner",
  },
  {
    id: 4,
    icon: "♚",
    title: "Check",
    description: "Understand what check means and how to escape it.",
    level: "Beginner",
  },
  {
    id: 5,
    icon: "♛",
    title: "Checkmate",
    description: "Learn how a chess game is won by trapping the king.",
    level: "Beginner",
  },
  {
    id: 6,
    icon: "♜",
    title: "Castling",
    description: "Learn this special move and why it is important for king safety.",
    level: "Beginner",
  },
  {
    id: 7,
    icon: "♝",
    title: "Pawn Promotion",
    description: "Discover what happens when a pawn reaches the final rank.",
    level: "Beginner",
  },
  {
    id: 8,
    icon: "♟",
    title: "En Passant",
    description: "Understand one of the most unusual moves in chess.",
    level: "Beginner",
  },
];

function Learn({ onBack }) {
  const [selectedLesson, setSelectedLesson] = useState(null);

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
  };

  const closeLesson = () => {
    setSelectedLesson(null);
  };

  return (
    <div className="learn-page">
      <div className="learn-container">

        <button className="learn-back-btn" onClick={onBack}>
          ← Back to ChessArena
        </button>

        <section className="learn-hero">
          <div className="learn-badge">
            ♟ CHESS ACADEMY
          </div>

          <h1>
            Learn Chess.
            <br />
            <span>Play Better.</span>
          </h1>

          <p>
            Build your chess knowledge from the ground up.
            Learn the rules, understand the game and become a stronger player.
          </p>
        </section>

        <section className="learn-progress-section">
          <div className="learn-progress-header">
            <div>
              <span className="section-label">YOUR JOURNEY</span>
              <h2>Chess Basics</h2>
            </div>

            <div className="progress-count">
              <strong>0</strong>
              <span>/ 8 lessons</span>
            </div>
          </div>

          <div className="progress-track">
            <div className="progress-fill"></div>
          </div>

          <p className="progress-text">
            Start your chess journey with the fundamentals.
          </p>
        </section>

        <section className="lessons-section">

          <div className="section-heading">
            <div>
              <span className="section-label">FOUNDATIONS</span>
              <h2>Chess Basics</h2>
            </div>

            <span className="lesson-total">
              8 Lessons
            </span>
          </div>

          <div className="lessons-grid">

            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                className="lesson-card"
                onClick={() => handleLessonClick(lesson)}
              >
                <div className="lesson-number">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="lesson-icon">
                  {lesson.icon}
                </div>

                <div className="lesson-content">
                  <div className="lesson-top">
                    <span>{lesson.level}</span>
                    <span>→</span>
                  </div>

                  <h3>{lesson.title}</h3>

                  <p>{lesson.description}</p>
                </div>
              </button>
            ))}

          </div>
        </section>

        <section className="coming-soon-section">

          <div className="coming-soon-icon">
            ⚔
          </div>

          <div>
            <span className="section-label">COMING NEXT</span>

            <h2>
              Strategy & Tactics
            </h2>

            <p>
              Openings, forks, pins, skewers, discovered attacks,
              sacrifices and much more.
            </p>
          </div>

          <span className="coming-soon-tag">
            SOON
          </span>

        </section>

      </div>

      {selectedLesson && (
        <div className="lesson-modal-overlay" onClick={closeLesson}>
          <div
            className="lesson-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="lesson-close"
              onClick={closeLesson}
              aria-label="Close lesson"
            >
              ×
            </button>

            <div className="lesson-modal-icon">
              {selectedLesson.icon}
            </div>

            <span className="section-label">
              LESSON {selectedLesson.id}
            </span>

            <h2>{selectedLesson.title}</h2>

            <p>
              {selectedLesson.description}
            </p>

            <div className="lesson-coming-box">
              <span>♟</span>

              <div>
                <strong>Interactive lesson coming next</strong>
                <small>
                  We're building the chessboard experience for this lesson.
                </small>
              </div>
            </div>

            <button
              className="lesson-start-btn"
              onClick={closeLesson}
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Learn;