console.log('Quiz app script loaded');

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
    
    // Check for URL parameter to jump to specific question
    const params = new URLSearchParams(window.location.search);
    const jumpToQuestion = params.get('question');
    
    if (jumpToQuestion) {
      const questionIndex = parseInt(jumpToQuestion, 10) - 1; // Convert 1-based to 0-based
      if (questionIndex >= 0 && questionIndex < currentQuiz.questions.length) {
        showQuestion(questionIndex);
        return;
      }
    }
    
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

// Start quiz (go to first question or URL parameter)
function startQuiz() {
  const params = new URLSearchParams(window.location.search);
  const jumpToQuestion = params.get('question');
  
  if (jumpToQuestion) {
    const questionIndex = parseInt(jumpToQuestion, 10) - 1; // Convert 1-based to 0-based
    if (questionIndex >= 0 && questionIndex < currentQuiz.questions.length) {
      currentQuestionIndex = questionIndex;
      showQuestion(questionIndex);
      return;
    }
  }
  
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

  if (index < 0) {
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

  console.log('Rendering', currentQuestion.options.length, 'options for question:', currentQuestion.title.substring(0, 40));

  currentQuestion.options.forEach((option, index) => {
    const optionEl = document.createElement('div');
    optionEl.className = 'option';
    optionEl.innerHTML = `
      <div class="option-text">${option.text}</div>
    `;

    console.log(`Created option ${index}:`, option.text.substring(0, 40), 'isCorrect:', option.isCorrect);

    optionEl.addEventListener('click', () => {
      console.log('Clicked on option', index);
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
  console.log('highlightOption called with index:', index, 'userSelected:', userSelected);
  const options = document.querySelectorAll('.option');
  options.forEach((opt, i) => {
    opt.classList.remove('active');
    if (i === index && !userSelected) {
      console.log(`Adding active class to option ${i}: "${opt.textContent.substring(0, 40)}..."`);
      opt.classList.add('active');
    }
  });
  currentOptionIndex = index;
}

// Mark selected option
function markSelected(index) {
  const options = document.querySelectorAll('.option');
  const correctIndex = currentQuestion.options.findIndex(o => o.isCorrect == true);

  options.forEach((opt, i) => {
    const textContent = opt.textContent.substring(0, 50).trim();
    const hadSelected = opt.classList.contains('selected');
    opt.classList.remove('active');
    if (i === correctIndex) {
      opt.classList.add('selected');
    } else {
      opt.classList.remove('selected');
    }
  });
  userSelected = true;
}

// Reveal answer for multiple choice
function revealMultipleChoiceAnswer() {
  console.log('revealMultipleChoiceAnswer called');
  const options = document.querySelectorAll('.option');
  console.log('Found', options.length, 'options');
  
  options.forEach((opt, index) => {
    const option = currentQuestion.options[index];
    const textContent = opt.textContent.substring(0, 50).trim();
    console.log(`DOM Element ${index} ("${textContent}"): API says isCorrect=${option.isCorrect}`);
    
    // Clear all state classes
    opt.classList.remove('selected', 'active', 'correct', 'disabled');
    
    // Apply correct state
    if (option.isCorrect) {
      console.log(`  -> Adding CORRECT (green) to DOM element ${index}`);
      opt.classList.add('correct');
    } else {
      console.log(`  -> Adding DISABLED (gray) to DOM element ${index}`);
      opt.classList.add('disabled');
    }
  });

  document.getElementById('answerContainer').classList.add('hidden');
  document.getElementById('navHint').innerHTML = 
    'Press <strong>Space</strong> or <strong>→</strong> for next question';
  answerRevealed = true;
  console.log('Multiple choice answer revealed');
}

// Reveal answer for free text
function revealFreeTextAnswer() {
  console.log('revealFreeTextAnswer called');
  const input = document.getElementById('freeTextInput');
  if (input) {
    input.disabled = true;
  }

  const answerContainer = document.getElementById('answerContainer');
  console.log('answerContainer exists:', !!answerContainer);
  answerContainer.classList.remove('hidden');
  console.log('answerContainer hidden removed');
  
  const answerText = document.getElementById('answerText');
  console.log('answerText element exists:', !!answerText);
  answerText.textContent = currentQuestion.answer;
  console.log('Answer text set to:', currentQuestion.answer);

  document.getElementById('navHint').innerHTML = 
    'Press <strong>Space</strong> or <strong>→</strong> for next question';
  answerRevealed = true;
  console.log('Free text answer revealed');
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  console.log('Keydown:', e.key);
  
  // Always allow back navigation
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (currentQuestionIndex > 0) {
      showQuestion(currentQuestionIndex - 1);
    }
    return;
  }
  
  // Multiple choice navigation
  if (currentQuestion?.type === 'Multiple Choice' && !answerRevealed) {
    console.log('In Multiple Choice - answerRevealed:', answerRevealed, 'userSelected:', userSelected);
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
    } else if (e.code === 'Space' || e.key === ' ') {
      console.log('Space in Multiple Choice, userSelected:', userSelected, 'currentOptionIndex:', currentOptionIndex);
      e.preventDefault();
      if (!userSelected) {
        console.log('First Space - marking selected at index', currentOptionIndex);
        markSelected(currentOptionIndex);
        document.getElementById('navHint').innerHTML = 
          'Press <strong>Space</strong> again to reveal answer';
      } else {
        console.log('Second Space - revealing answer');
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
    console.log('In Free Text handler - key:', e.key);
    if (e.code === 'Space' || e.key === ' ' || e.key === 'ArrowRight') {
      console.log('Calling revealFreeTextAnswer');
      e.preventDefault();
      revealFreeTextAnswer();
      return;
    }
  }

  // Navigation between questions (after answer revealed)
  if (answerRevealed) {
    if (e.code === 'Space') {
      e.preventDefault();
      showQuestion(currentQuestionIndex + 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      showQuestion(currentQuestionIndex + 1);
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
