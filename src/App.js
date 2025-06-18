// frontend/src/App.js
import React, { useState } from 'react';
import './obsidian.css';
import Sidebar   from './Sidebar';
import NoteEditor from './NoteEditor';
import NotesList from './NotesList';
import Register   from './Register';

function App() {
  const [token, setToken]               = useState(localStorage.getItem('token') || '');
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');

  // LOGIN
  const handleLogin = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch {
      setError('Ошибка соединения');
    }
  };

  // после успешной регистрации вернуться к логину
  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  // пока нет токена — показываем форму
  if (!token) {
    return (
      <div className="app-container">
        {showRegister ? (
          <>
            <h2>Регистрация</h2>
            <Register onRegister={handleRegisterSuccess}/>
            <p>
              Уже есть аккаунт?{' '}
              <button onClick={() => setShowRegister(false)}>Войти</button>
            </p>
          </>
        ) : (
          <>
            <h2>Вход</h2>
            <form onSubmit={handleLogin}>
              <input
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="submit">Войти</button>
            </form>
            {error && <div className="error">{error}</div>}
            <p>
              Нет аккаунта?{' '}
              <button onClick={() => setShowRegister(true)}>Зарегистрироваться</button>
            </p>
          </>
        )}
      </div>
    );
  }

  // основной UI: grid из sidebar и контента
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
  };

  return (
    <div className="app-grid">
      <Sidebar />
      <div className="app-content">
        <button className="logout-btn" onClick={handleLogout}>Выйти</button>
        <h1>Offline Browser — Ваши заметки</h1>
        <NoteEditor token={token} onCreated={() => window.location.reload()}/>
        <NotesList  token={token}/>
      </div>
    </div>
  );
}

export default App;
