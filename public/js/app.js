// Quiz App State
let quizzes = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let currentQuestion = null;
let currentOptionIndex = 0;
let answerRevealed = false;
let userSelected = false;
let userAnswer = null;

// DOM Elements
const app = document.getElementById('app');
const startPage = document.getElementById('startPage');
const questionPage = document.getElementById('questionPage');
const quizSelectPage = document.getElementById('quizSelectPage');

// Initialize app
async function init() {
  try {
    const response = await fetch('/api/quizzes');
    quizzes = await response.json();
    
    if (quizzes.length === 1) {
      // Auto-select if only one quiz
      loadQuiz(quizzes[0].name);
      showStartPage();
    } else if (quizzes.length > 1) {
      showQuizSelect();
    }
  } catch (error) {
    console.error('Error loading quizzes:', error);
  }
}

// Load quiz data
async function loadQuiz(quizName) {
  try {
    const response = await fetch(`/api/quiz/${quizName}`);
    currentQuiz = await response.json();
    currentQuestionIndex = 0;
    showStartPage();
  } catch (error) {
    console.error('Error loading quiz:', error);
  }
}

// Show start page with media gallery
function showStartPage() {
  startPage.classList.remove('hidden');
  questionPage.classList.add('hidden');
  quizSelectPage.classList.add('hidden');

  if (currentQuiz) {
    document.getElementById('quizTitle').textContent = currentQuiz.title;
    populateMediaGallery();
  }
}

// Populate media gallery on start page
function populateMediaGallery() {
  const gallery = document.getElementById('mediaGallery');
  gallery.innerHTML = '';

  currentQuiz.questions.forEach(q => {
    if (q.media) {
      const mediaPath = `/api/media/${getQuizName()}/${q.media}`;
      const ext = q.media.toLowerCase();
      let item;

      if (ext.includes('.mov') || ext.includes('.mp4') || ext.includes('.webm')) {
        item = document.createElement('video');
        item.src = mediaPath;
        item.controls = false;
        item.autoplay = false;
      } else {
        item = document.createElement('img');
        item.src = mediaPath;
        item.alt = q.title;
      }

      const container = document.createElement('div');
      container.className = 'media-item';
      container.appendChild(item);
      gallery.appendChild(container);
    }
  });
}

// Get current quiz name from URL or stored value
function getQuizName() {
  if (currentQuiz?.name) {
    return currentQuiz.name;
  }
  return 'Ausstand';
}

// Show quiz selection page
function showQuizSelect() {
  startPage.classList.add('hidden');
  questionPage.classList.add('hidden');
  quizSelectPage.classList.remove('hidden');

  const quizList = document.getElementById('quizList');
  quizList.innerHTML = '';

  quizzes.forEach(quiz => {
    const item = document.createElement('div');
    item.className = 'quiz-item';
    item.textContent = quiz.name;
    item.onclick = () => {
      loadQuiz(quiz.name);
    };
    quizList.appendChild(item);
  });
}

// Start quiz (go to first question)
function startQuiz() {
  currentQuestionIndex = 0;
  showQuestion(0);
}

// Show question
function showQuestion(index) {
  if (!currentQuiz || index >= currentQuiz.questions.length) {
    alert('Quiz finished!');
    showStartPage();
    return;
  }

  currentQuestionIndex = index;
  currentQuestion = currentQuiz.questions[index];
  currentOptionIndex = 0;
  answerRevealed = false;
  userSelected = false;
  userAnswer = null;

  startPage.classList.add('hidden');
  quizSelectPage.classList.add('hidden');
  questionPage.classList.remove('hidden');

  // Update header
  document.getElementById('questionCount').textContent = 
    `${index + 1}/${currentQuiz.questions.length}`;

  const bonusIndicator = document.getElementById('bonusIndicator');
  if (currentQuestion.isBonus) {
    bonusIndicator.classList.remove('hidden');
  } else {
    bonusIndicator.classList.add('hidden');
  }

  // Update title
  document.getElementById('questionTitle').textContent = currentQuestion.title;

  // Update media
  const mediaContainer = document.getElementById('mediaContainer');
  mediaContainer.innerHTML = '';
  if (currentQuestion.media) {
    const mediaPath = `/api/media/${getQuizName()}/${currentQuestion.media}`;
    const ext = currentQuestion.media.toLowerCase();
    let media;

    if (ext.includes('.mov') || ext.includes('.mp4') || ext.includes('.webm')) {
      media = document.createElement('video');
      media.src = mediaPath;
      media.controls = true;
      media.autoplay = true;
      media.muted = true;
    } else {
      media = document.createElement('img');
      media.src = mediaPath;
      media.alt = currentQuestion.title;
    }

    mediaContainer.appendChild(media);
  }

  // Clear answer container
  document.getElementById('answerContainer').classList.add('hidden');

  // Render options or input based on type
  if (currentQuestion.type === 'Multiple Choice') {
    renderMultipleChoice();
  } else if (currentQuestion.type === 'Free Text') {
    renderFreeText();
  }

  // Reset selection state
  userSelected = false;
}

// Render multiple choice options
function renderMultipleChoice() {
  const optionsContainer = document.getElementById('optionsContainer');
  optionsContainer.innerHTML = '';

  currentQuestion.options.forEach((option, index) => {
    const optionEl = document.createElement('div');
    optionEl.className = 'option';
    optionEl.innerHTML = `
      <div class="option-checkbox"></div>
      <div class="option-text">${option.text}</div>
    `;

    optionEl.addEventListener('click', () => {
      currentOptionIndex = index;
      highlightOption(index);
    });

    optionsContainer.appendChild(optionEl);
  });

  // Don't auto-highlight first option - let user navigate
  currentOptionIndex = 0;

  // Update navigation hint
  document.getElementById('navHint').innerHTML = 
    'Press <strong>↑</strong> <strong>↓</strong> to choose, <strong>Space</strong> to select';
}

// Render free text input
function renderFreeText() {
  const optionsContainer = document.getElementById('optionsContainer');
  optionsContainer.innerHTML = `
    <div class="free-text-container">
      <input 
        type="text" 
        class="free-text-input" 
        placeholder="Type your answer here..."
        id="freeTextInput"
      />
    </div>
  `;

  const input = document.getElementById('freeTextInput');
  input.focus();

  // Update navigation hint
  document.getElementById('navHint').innerHTML = 
    'Press <strong>Space</strong> or <strong>→</strong> to reveal the answer';
}

// Highlight option (user is navigating)
function highlightOption(index) {
  const options = document.querySelectorAll('.option');
  options.forEach((opt, i) => {
    opt.classList.remove('active');
    if (i === index && !userSelected) {
      opt.classList.add('active');
    }
  });
  currentOptionIndex = index;
}

// Mark selected option
function markSelected(index) {
  const options = document.querySelectorAll('.option');
  options.forEach((opt, i) => {
    opt.classList.remove('active');
    if (i === index) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
  currentOptionIndex = index;
  userSelected = true;
}

// Reveal answer for multiple choice
function revealMultipleChoiceAnswer() {
  const options = document.querySelectorAll('.option');
  options.forEach((opt, index) => {
    const option = currentQuestion.options[index];
    
    if (option.isCorrect) {
      opt.classList.remove('selected');
      opt.classList.add('correct');
    } else if (index !== currentOptionIndex) {
      opt.classList.add('disabled');
    }
  });

  document.getElementById('answerContainer').classList.add('hidden');
  document.getElementById('navHint').innerHTML = 
    'Press <strong>Space</strong> or <strong>→</strong> for next question';
  answerRevealed = true;
}

// Reveal answer for free text
function revealFreeTextAnswer() {
  const input = document.getElementById('freeTextInput');
  input.disabled = true;

  const answerContainer = document.getElementById('answerContainer');
  answerContainer.classList.remove('hidden');
  document.getElementById('answerText').textContent = currentQuestion.answer;

  document.getElementById('navHint').innerHTML = 
    'Press <strong>Space</strong> or <strong>→</strong> for next question';
  answerRevealed = true;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  // Multiple choice navigation
  if (currentQuestion?.type === 'Multiple Choice' && !answerRevealed) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!userSelected) {
        currentOptionIndex = (currentOptionIndex - 1 + currentQuestion.options.length) % 
                            currentQuestion.options.length;
        highlightOption(currentOptionIndex);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!userSelected) {
        currentOptionIndex = (currentOptionIndex + 1) % currentQuestion.options.length;
        highlightOption(currentOptionIndex);
      }
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (!userSelected) {
        markSelected(currentOptionIndex);
        document.getElementById('navHint').innerHTML = 
          'Press <strong>Space</strong> again to reveal answer';
      } else {
        revealMultipleChoiceAnswer();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (!userSelected) {
        markSelected(currentOptionIndex);
        document.getElementById('navHint').innerHTML = 
          'Press <strong>Space</strong> again to reveal answer';
      } else {
        revealMultipleChoiceAnswer();
      }
    }
  }

  // Free text answer reveal
  if (currentQuestion?.type === 'Free Text' && !answerRevealed) {
    if ((e.code === 'Space' || e.key === 'ArrowRight') && document.activeElement.id === 'freeTextInput') {
      e.preventDefault();
      revealFreeTextAnswer();
    }
  }

  // Navigation between questions
  if (answerRevealed) {
    if (e.code === 'Space') {
      e.preventDefault();
      showQuestion(currentQuestionIndex + 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      showQuestion(currentQuestionIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showQuestion(currentQuestionIndex - 1);
    }
  }

  // Start quiz from start page
  if (!questionPage.classList.contains('hidden') === false && startPage.classList.contains('hidden') === false) {
    if (e.code === 'Space') {
      e.preventDefault();
      startQuiz();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      startQuiz();
    }
  }
});

// Initialize on load
window.addEventListener('load', init);

// Allow arrow key navigation on start page
document.addEventListener('keydown', (e) => {
  if (startPage.classList.contains('hidden') === false && questionPage.classList.contains('hidden') === true) {
    if (e.code === 'Space' || e.key === 'ArrowRight') {
      e.preventDefault();
      startQuiz();
    }
  }
});
