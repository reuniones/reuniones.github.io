import React, { useState, useEffect } from 'react';
import { dataService } from './services/dataService';
import './index.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [config, setConfig] = useState(dataService.getConfig());
  const [showModal, setShowModal] = useState(false);
  const [showReunionModal, setShowReunionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [selectedReunion, setSelectedReunion] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // Ejemplo de uso de JSONata: Obtener todos los publicadores ordenados por nombre
    const p = await dataService.queryData('Personas', '$ ^(nombre)');
    const r = await dataService.getReuniones();
    setPersonas(p || []);
    setReuniones(r || []);
    setLoading(false);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ssIdParam = urlParams.get('ssId');
    const apiUrlParam = urlParams.get('apiUrl');

    if (ssIdParam || apiUrlParam) {
      const newConfig = {
        ...config,
        ...(ssIdParam && { spreadsheetId: ssIdParam }),
        ...(apiUrlParam && { apiUrl: apiUrlParam })
      };
      dataService.saveConfig(newConfig);
      setConfig(newConfig);
      window.history.replaceState({}, document.title, window.location.pathname); // Clean URL
    }

    if (!config.apiUrl || !config.spreadsheetId) {
      setShowConfigModal(true);
    }

    fetchData();
  }, []);

  const handleSavePersona = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const habilidades = ['Lectura', 'Oración', 'Discursos', 'Tesoros', 'Perlas', 'Conversación']
      .filter(h => formData.get(h.toLowerCase()));

    const newPersona = {
      id: editingPersona?.id || Date.now(),
      nombre: formData.get('nombre'),
      genero: formData.get('genero'),
      privilegios: formData.get('privilegios'),
      habilidades: habilidades
    };

    const updated = await dataService.savePersona(newPersona);
    setPersonas(updated);
    setShowModal(false);
    setEditingPersona(null);
  };

  const handleSaveReunion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newReunion = {
      id: selectedReunion?.id || Date.now(),
      fecha: formData.get('fecha'),
      tipo: formData.get('tipo'),
      asignaciones: selectedReunion?.asignaciones || {}
    };
    const updated = await dataService.saveReunion(newReunion);
    setReuniones(updated);
    setShowReunionModal(false);
    setSelectedReunion(null);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newConfig = {
      apiUrl: formData.get('apiUrl'),
      spreadsheetId: formData.get('spreadsheetId')
    };
    await dataService.saveConfig(newConfig);
    setConfig(newConfig);
    setShowConfigModal(false);
    if (newConfig.apiUrl) {
      setLoading(true);
      await dataService.initSheets();
      await fetchData();
    }
  };

  const handleAsignar = async (parte, personaId) => {
    if (!selectedReunion) return;
    const updatedReunion = {
      ...selectedReunion,
      asignaciones: { ...selectedReunion.asignaciones, [parte]: personaId }
    };
    const updated = await dataService.saveReunion(updatedReunion);
    setReuniones(updated);
    setSelectedReunion(updatedReunion);
  };

  const getPersonaName = (id) => personas.find(p => p.id === Number(id))?.nombre || 'Sin asignar';

  return (
    <div className="layout">
      <aside className="sidebar glass">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2.5rem', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>JW</div>
          <h2 style={{ color: 'var(--text)', fontSize: '1.25rem' }}>Gestor Reuniones</h2>
        </div>
        <nav>
          <a href="#" className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Tablero</a>
          <a href="#" className={`nav-link ${activeTab === 'personas' ? 'active' : ''}`} onClick={() => setActiveTab('personas')}>Personas</a>
          <a href="#" className={`nav-link ${activeTab === 'reuniones' ? 'active' : ''}`} onClick={() => setActiveTab('reuniones')}>Programación</a>
          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <button className="nav-link" style={{ width: '100%', textAlign: 'left', background: 'none' }} onClick={() => setShowConfigModal(true)}>
              ⚙️ Configuración
            </button>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>
              {activeTab === 'dashboard' ? 'Tablero General' : activeTab === 'personas' ? 'Gestión de Personas' : 'Programación Semanal'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Sincronizando datos...' : (config.apiUrl ? 'Sincronizado con Google Sheets' : 'Usando almacenamiento local')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {activeTab === 'personas' && (
              <button className="primary" onClick={() => { setEditingPersona(null); setShowModal(true); }}>+ Añadir Persona</button>
            )}
            {activeTab === 'reuniones' && (
              <button className="primary" onClick={() => { setSelectedReunion(null); setShowReunionModal(true); }}>+ Nueva Reunión</button>
            )}
          </div>
        </header>

        <div className="content-area">
          {(!config.apiUrl || !config.spreadsheetId) && (
            <div className="glass" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--warning)' }}>
              <h3 style={{ color: 'var(--warning)' }}>⚠️ Configuración Requerida</h3>
              <p>Por favor, configura la <strong>URL de la API</strong> y el <strong>Spreadsheet ID</strong> para comenzar a sincronizar datos.</p>
              <button className="primary" style={{ marginTop: '1rem' }} onClick={() => setShowConfigModal(true)}>Configurar Ahora</button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="glass" style={{ padding: '1.5rem' }}>
                <h3>Estado de la Congregación</h3>
                <div style={{ marginTop: '1rem' }}>
                  <div className="stat-row"><span>Total Publicadores</span><span className="stat-val">{personas.length}</span></div>
                  <div className="stat-row"><span>Reuniones Programadas</span><span className="stat-val">{reuniones.length}</span></div>
                </div>
              </div>
              <div className="glass" style={{ padding: '1.5rem' }}>
                <h3>Próxima Reunión</h3>
                {reuniones.length > 0 ? (
                  <div style={{ marginTop: '1rem' }}>
                    <p><strong>{reuniones[0].tipo}</strong></p>
                    <p style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{reuniones[0].fecha}</p>
                  </div>
                ) : <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>No hay reuniones próximas.</p>}
              </div>
            </div>
          )}

          {activeTab === 'personas' && (
            <div className="glass" style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr><th>Nombre</th><th>Género</th><th>Privilegios</th><th>Habilidades</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {personas.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: '600' }}>{p.nombre}</td>
                      <td><span className={`badge ${p.genero}`}>{p.genero === 'H' ? 'Varón' : 'Mujer'}</span></td>
                      <td>{p.privilegios}</td>
                      <td><div className="skill-tags">{p.habilidades?.map(h => <span key={h} className="skill-tag">{h}</span>)}</div></td>
                      <td><button className="btn-icon" onClick={() => { setEditingPersona(p); setShowModal(true); }}>✎</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reuniones' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedReunion ? '300px 1fr' : '1fr', gap: '1.5rem' }}>
              <div className="glass" style={{ padding: '1.5rem' }}>
                <h3>Listado de Reuniones</h3>
                <div style={{ marginTop: '1rem' }}>
                  {reuniones.map(r => (
                    <div
                      key={r.id}
                      className={`nav-link ${selectedReunion?.id === r.id ? 'active' : ''}`}
                      onClick={() => setSelectedReunion(r)}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span>{r.fecha}</span>
                      <small>{r.tipo === 'Vida y Ministerio' ? 'V&M' : 'Fin de Semana'}</small>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReunion && (
                <div className="glass" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h3>Partes de la Reunión ({selectedReunion.fecha})</h3>
                    <span className="badge H">{selectedReunion.tipo}</span>
                  </div>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {['Lectura', 'Oración Inicial', 'Tesoros', 'Perlas', 'Discurso 1', 'Discurso 2', 'Oración Final'].map(parte => {
                      const asignadoId = selectedReunion.asignaciones?.[parte];
                      const aptos = personas.filter(p => {
                        if (parte.includes('Oración') || parte === 'Lectura') return p.genero === 'H';
                        return true;
                      });

                      return (
                        <div key={parte} className="stat-row" style={{ alignItems: 'center' }}>
                          <span style={{ fontWeight: '500' }}>{parte}</span>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span style={{ color: asignadoId ? 'var(--text)' : 'var(--danger)', fontSize: '0.9rem' }}>
                              {getPersonaName(asignadoId)}
                            </span>
                            <select
                              style={{ width: 'auto', padding: '0.4rem' }}
                              value={asignadoId || ''}
                              onChange={(e) => handleAsignar(parte, e.target.value)}
                            >
                              <option value="">Asignar...</option>
                              {aptos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal Persona */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <h3>{editingPersona ? 'Editar Persona' : 'Nueva Persona'}</h3>
            <form onSubmit={handleSavePersona} style={{ marginTop: '1.5rem' }}>
              <div className="form-group"><label>Nombre</label><input name="nombre" defaultValue={editingPersona?.nombre} required /></div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}><label>Género</label><select name="genero" defaultValue={editingPersona?.genero || 'H'}><option value="H">Varón</option><option value="M">Mujer</option></select></div>
                <div className="form-group" style={{ flex: 1 }}><label>Privilegios</label><select name="privilegios" defaultValue={editingPersona?.privilegios || 'Publicador'}><option>Publicador</option><option>Anciano</option><option>Siervo Ministerial</option><option>Precursor</option></select></div>
              </div>
              <div className="form-group">
                <label>Habilidades</label>
                <div className="checkbox-grid">
                  {['Lectura', 'Oración', 'Discursos', 'Tesoros', 'Perlas', 'Conversación'].map(h => (
                    <label key={h} className="checkbox-label"><input type="checkbox" name={h.toLowerCase()} defaultChecked={editingPersona?.habilidades?.includes(h)} /> {h}</label>
                  ))}
                </div>
              </div>
              <div className="modal-actions"><button type="button" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="primary">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reunion */}
      {showReunionModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <h3>Nueva Reunión</h3>
            <form onSubmit={handleSaveReunion} style={{ marginTop: '1.5rem' }}>
              <div className="form-group"><label>Fecha</label><input type="date" name="fecha" required /></div>
              <div className="form-group"><label>Tipo de Reunión</label><select name="tipo"><option>Vida y Ministerio</option><option>Fin de Semana</option></select></div>
              <div className="modal-actions"><button type="button" onClick={() => setShowReunionModal(false)}>Cancelar</button><button type="submit" className="primary">Crear</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Configuración */}
      {showConfigModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <h3>Configuración del Sistema</h3>
            <form onSubmit={handleSaveConfig} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>URL de Apps Script (Web App URL)</label>
                <input name="apiUrl" defaultValue={config.apiUrl} placeholder="https://script.google.com/macros/s/.../exec" />
              </div>
              <div className="form-group">
                <label>Spreadsheet ID (Opcional si es script vinculado)</label>
                <input name="spreadsheetId" defaultValue={config.spreadsheetId} placeholder="ID de la hoja de cálculo (de la URL)" />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  Deja en blanco para usar la hoja vinculada al script o almacenamiento local.
                </p>
              </div>
              <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
                <button type="button" className="danger" style={{ background: 'var(--danger)', color: 'white' }} onClick={async () => {
                  if (window.confirm('¿Estás seguro de que deseas borrar TODOS los datos?')) {
                    setLoading(true);
                    await dataService.clearData('Personas');
                    await dataService.clearData('Reuniones');
                    await fetchData();
                    setShowConfigModal(false);
                  }
                }}>
                  Limpiar Todo
                </button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" onClick={() => setShowConfigModal(false)}>Cerrar</button>
                  <button type="submit" className="primary">Guardar URL</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
