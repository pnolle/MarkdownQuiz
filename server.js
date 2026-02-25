const express = require('express');
const fs = require('fs');
const path = require('path');
const markdownIt = require('markdown-it');

const app = express();
const port = 3000;
const md = new markdownIt();

// Serve static files
app.use(express.static('public'));

// Parse quiz markdown file
function parseQuiz(quizPath) {
  const content = fs.readFileSync(quizPath, 'utf-8');
  const lines = content.split('\n');
  
  let title = '';
  let currentQuestion = null;
  let questions = [];
  let mediaFiles = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract title
    if (line.startsWith('# ')) {
      title = line.replace('# ', '').trim();
      continue;
    }

    // Extract question header (###)
    if (line.startsWith('### ')) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        id: questions.length + 1,
        title: line.replace('### ', '').trim(),
        type: null,
        media: null,
        options: [],
        answer: null,
        isBonus: line.includes('Bonus') || line.includes('bonus')
      };
      continue;
    }

    if (!currentQuestion) continue;

    // Extract media (![alt](path))
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch) {
      const mediaPath = imgMatch[2];
      currentQuestion.media = mediaPath;
      if (!mediaFiles.includes(mediaPath)) {
        mediaFiles.push(mediaPath);
      }
      continue;
    }

    // Extract Type
    if (line.includes('**Type:**')) {
      const typeMatch = line.match(/\*\*Type:\*\*\s*(.+)/);
      if (typeMatch) {
        currentQuestion.type = typeMatch[1].trim();
      }
      continue;
    }

    // Extract Answer
    if (line.includes('**Answer:**')) {
      const answerMatch = line.match(/\*\*Answer:\*\*\s*(.+)/);
      if (answerMatch) {
        currentQuestion.answer = answerMatch[1].trim();
      }
      continue;
    }

    // Extract options (- [ ] or - [x])
    if (line.match(/^\s*- \[([ x])\]/i)) {
      const isCorrect = line.match(/^\s*- \[x\]/i) !== null;
      const optionText = line.replace(/^\s*- \[[ x]\]\s*/i, '').trim();
      currentQuestion.options.push({
        text: optionText,
        isCorrect: isCorrect
      });
    }
  }

  // Add last question
  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return {
    title,
    questions,
    mediaFiles
  };
}

// API: Get available quizzes
app.get('/api/quizzes', (req, res) => {
  const quizzesDir = path.join(__dirname, 'quizzes');
  const quizzes = [];

  const dirs = fs.readdirSync(quizzesDir);
  dirs.forEach(dir => {
    const quizPath = path.join(quizzesDir, dir, `${dir}.md`);
    if (fs.existsSync(quizPath)) {
      quizzes.push({
        name: dir,
        path: quizPath
      });
    }
  });

  res.json(quizzes);
});

// API: Get quiz content
app.get('/api/quiz/:name', (req, res) => {
  const quizPath = path.join(__dirname, 'quizzes', req.params.name, `${req.params.name}.md`);
  
  if (!fs.existsSync(quizPath)) {
    return res.status(404).json({ error: 'Quiz not found' });
  }

  const quiz = parseQuiz(quizPath);
  quiz.name = req.params.name;
  res.json(quiz);
});

// API: Get media file
app.get('/api/media/:quiz/:filename', (req, res) => {
  const mediaPath = path.join(__dirname, 'quizzes', req.params.quiz, req.params.filename);
  
  if (!fs.existsSync(mediaPath)) {
    return res.status(404).json({ error: 'Media file not found' });
  }

  res.sendFile(mediaPath);
});

app.listen(port, () => {
  console.log(`Quiz app running at http://localhost:${port}`);
});
