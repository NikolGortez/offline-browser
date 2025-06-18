// frontend/src/NoteEditor.js
import React, { useState } from 'react';

export default function NoteEditor({ token, onCreated }) {
  const [title, setTitle]     = useState('');
  const [content, setContent] = useState('');
  const [isGlobal, setGlobal] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3001/notes', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content, is_global: isGlobal })
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Status ${res.status}`);
      }
      setTitle('');
      setContent('');
      setGlobal(false);
      onCreated && onCreated();
    } catch (err) {
      console.error('Create note error:', err);
      setError('Не удалось создать заметку');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="note-editor">
      <h2>Создать заметку</h2>
      <input
        type="text"
        placeholder="Заголовок"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Содержание"
        value={content}
        onChange={e => setContent(e.target.value)}
        required
      />
      <label>
        <input
          type="checkbox"
          checked={isGlobal}
          onChange={e => setGlobal(e.target.checked)}
        /> Глобальная
      </label>
      <button type="submit">Сохранить</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
