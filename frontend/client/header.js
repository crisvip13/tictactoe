// client/components/header.js

function cargarHeaderUsuario() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  fetch('http://localhost:3000/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    const saldo = data.saldo;

    // Crear barra superior
    const header = document.createElement('div');
    header.id = 'headerSaldo';
    header.style = `
      position: fixed;
      top: 0;
      right: 0;
      left: 0;
      background: #f5f5f5;
      padding: 12px 24px;
      font-family: Arial, sans-serif;
      font-size: 16px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
    `;

    header.innerHTML = `
      <div>👤 Usuario conectado</div>
      <div>💰 Saldo: S/ ${saldo}</div>
    `;

    document.body.prepend(header);
    document.body.style.paddingTop = '60px'; // Para que no tape contenido
  })
  .catch(err => {
    console.error('Error al cargar saldo en header:', err);
    alert('Error de autenticación. Inicia sesión de nuevo.');
    localStorage.removeItem('token');
    window.location.href = 'login.html';
  });
}
