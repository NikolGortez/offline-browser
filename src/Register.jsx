// frontend/src/Register.js

import React, { useState } from 'react';

export default function Register({ onRegister }) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    display_name: '',
    email: '',
  });
  const [error, setError] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Ошибка регистрации');
      } else {
        alert('Успешно зарегистрированы: ' + data.username);
        onRegister(); // возвращаемся к форме логина
      }
    } catch (err) {
      console.error(err);
      setError('Сетевая ошибка');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 400,
        margin: 'auto',
        padding: 20,
        border: '1px solid #ccc',
        borderRadius: 4,
        textAlign: 'center'
      }}
    >
      <h2>Регистрация</h2>

      <input
        name="username"
        placeholder="Username"
        value={form.username}
        onChange={handleChange}
        required
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <input
        name="password"
        type="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
        required
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <input
        name="display_name"
        placeholder="Display Name"
        value={form.display_name}
        onChange={handleChange}
        required
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <input
        name="email"
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
        required
        style={{ width: '100%', marginBottom: 10, padding: 8 }}
      />

      <button type="submit" style={{ padding: '10px 20px' }}>
        Зарегистрироваться
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: 10 }}>
          {error}
        </div>
      )}
    </form>
  );
}
