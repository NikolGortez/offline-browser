// frontend/src/NotesList.jsx
import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm      from 'remark-gfm';

export default function NotesList({ token }) {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setError('');
      try {
        const res = await fetch('http://localhost:3001/notes', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || `Status ${res.status}`);
        }
        setNotes(await res.json());
      } catch (err) {
        console.error('Load notes error:', err);
        setError('Ошибка загрузки заметок');
      }
    })();
  }, [token]);

  if (error) return <div className="error">{error}</div>;
  if (notes.length === 0) return <p>Заметок нет</p>;

  return (
    <div className="notes-list markdown-body">
      {notes.map(n => (
        <article key={n.id} style={{ marginBottom: 20 }}>
          <h3>{n.title}</h3>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {n.content}
          </ReactMarkdown>
          <hr/>
        </article>
      ))}
    </div>
  );
}
