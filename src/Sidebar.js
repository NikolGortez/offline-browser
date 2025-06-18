// frontend/src/Sidebar.js
import React, { useEffect, useState } from 'react';

export default function Sidebar() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/notes', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setNotes)
      .catch(err => console.error('Sidebar load error', err));
  }, []);

  return (
    <aside className="sidebar">
      <h2>Заметки</h2>
      <ul>
        {notes.map(n => <li key={n.id}>{n.title}</li>)}
      </ul>
    </aside>
  );
}
