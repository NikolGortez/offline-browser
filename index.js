// server/index.js


// 1. Подгружаем переменные окружения из файла .env в корне проекта
const path = require('path');
require('dotenv').config({
  // Если вы запускаете сервер из другой папки, можно явно указать путь:
  // path: path.resolve(__dirname, '../.env')
});

const express = require('express');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const helmet = require('helmet');
const cors   = require('cors');

const app = express();

// 2. Middleware безопасности и парсинга JSON
app.use(helmet());
app.use(express.json());

// 3. Настраиваем CORS по списку origins из .env
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3001'];
app.use(cors({ origin: corsOrigins }));

// 4. Проверяем обязательные переменные окружения
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set in .env');
  process.exit(1);
}

// 5. Подключаемся к базе через DATABASE_URL
const db = new Client({
  connectionString: process.env.DATABASE_URL
});
db.connect()
  .then(() => console.log('✅ Connected to Postgres'))
  .catch(err => {
    console.error('❌ Postgres connection error:', err);
    process.exit(1);
  });

// 6. Middleware для проверки JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.user = {
      user_id: payload.user_id,
      username: payload.username
    };
    next();
  });
}

// 7. Auth routes

// 7.1 Регистрация
app.post('/auth/register', async (req, res) => {
  const { username, password, display_name, email } = req.body;
  if (!username || !password || !display_name || !email) {
    return res.status(400).json({ error: 'Required: username, password, display_name, email' });
  }
  try {
    const exists = await db.query('SELECT id FROM users WHERE username=$1', [username]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'User already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users(username, display_name, email, password_hash)
       VALUES($1,$2,$3,$4)
       RETURNING id, username, display_name, email, created_at`,
      [username, display_name, email, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Server error on registration' });
  }
});

// 7.2 Логин
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Required: username, password' });
  }
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username=$1', [username]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { user_id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error on login' });
  }
});

// 8. CRUD для заметок

// 8.1 Получить все заметки пользователя + глобальные
app.get('/notes', authenticateToken, async (req, res) => {
  const userId = req.user.user_id;
  try {
    const result = await db.query(
      `SELECT *
       FROM notes
       WHERE (is_global = FALSE AND user_id = $1 AND is_deleted = FALSE)
          OR (is_global = TRUE  AND is_deleted = FALSE)
       ORDER BY updated_at DESC, created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (e) {
    console.error('Fetch notes error:', e);
    res.status(500).json({ error: 'Could not fetch notes' });
  }
});

// 8.2 Создать новую заметку
app.post('/notes', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  // приводим is_global к boolean
  const isGlobal = req.body.is_global === true || req.body.is_global === 'true';
  // парсим origin_id в число или null
  const originRaw = req.body.origin_id;
  const originId = originRaw ? parseInt(originRaw, 10) : null;
  if (originRaw && Number.isNaN(originId)) {
    return res.status(400).json({ error: 'origin_id must be a number or null' });
  }
  const userId = req.user.user_id;

  try {
    const { rows } = await db.query(
      `INSERT INTO notes(title, content, is_global, user_id, origin_id)
       VALUES($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, content, isGlobal, userId, originId]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Create note error:', e);
    res.status(500).json({ error: 'Could not create note' });
  }
});

// 8.3 Обновить существующую заметку (локальная версия через origin_id)
app.put('/notes/:id', authenticateToken, async (req, res) => {
  const originId = parseInt(req.params.id, 10);
  if (Number.isNaN(originId)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }
  const { title, content } = req.body;
  const userId = req.user.user_id;

  try {
    const { rows } = await db.query(
      `INSERT INTO notes(title, content, is_global, user_id, origin_id)
       VALUES($1, $2, FALSE, $3, $4)
       RETURNING *`,
      [title, content, userId, originId]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error('Update note error:', e);
    res.status(500).json({ error: 'Could not update note' });
  }
});

// 8.4 Удалить заметку (логическое удаление)
app.delete('/notes/:id', authenticateToken, async (req, res) => {
  const noteId = parseInt(req.params.id, 10);
  if (Number.isNaN(noteId)) {
    return res.status(400).json({ error: 'Invalid note id' });
  }

  try {
    const { rows } = await db.query(
      `UPDATE notes
       SET is_deleted = TRUE
       WHERE id = $1
       RETURNING *`,
      [noteId]
    );
    res.json(rows[0]);
  } catch (e) {
    console.error('Delete note error:', e);
    res.status(500).json({ error: 'Could not delete note' });
  }
});

// 9. Статика для фронтенда (если у вас собранный SPA лежит в ../frontend/build)
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// 10. Запуск сервера на порту из .env или 3001
const PORT = parseInt(process.env.PORT, 10) || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
