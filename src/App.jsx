import React, { useState, useEffect } from 'react';
import { dataService } from './services/dataService';
import './index.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [config, setConfig] = useState(dataService.getConfig());
  const [showModal, setShowModal] = useState(false);
  const [showReunionModal, setShowReunionModal] = useState(false);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [editingPlantilla, setEditingPlantilla] = useState(null);
  const [editingSala, setEditingSala] = useState(null);
  const [selectedReunion, setSelectedReunion] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    // Ejemplo de uso de JSONata: Obtener todos los publicadores ordenados por nombre
    const p = await dataService.queryData('Personas', '$ ^(nombre)');
    const r = await dataService.getReuniones();
    const pl = await dataService.getPlantillas();
    const sl = await dataService.getSalas();
    setPersonas(p || []);
    setReuniones(r || []);
    setPlantillas(pl || []);
    setSalas(sl.length > 0 ? sl : [{ id: 1, nombre: 'Principal' }]);
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

  const handleSavePlantilla = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPlantilla = {
      id: editingPlantilla?.id || Date.now(),
      nombre: formData.get('nombre'),
      tipo: formData.get('tipo'),
      estructura: editingPlantilla?.estructura || []
    };
    const updated = await dataService.savePlantilla(newPlantilla);
    setPlantillas(updated);
    setShowPlantillaModal(false);
    setEditingPlantilla(null);
  };

  const handleSaveReunion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedTemplateIds = Array.from(e.target.elements.plantillaIds)
      .filter(input => input.checked)
      .map(input => input.value);

    let datosReunion = selectedReunion?.datos_reunion ? JSON.parse(selectedReunion.datos_reunion) : { secciones: [] };

    if (selectedTemplateIds.length > 0) {
      selectedTemplateIds.forEach(id => {
        const plantilla = plantillas.find(p => p.id == id);
        if (plantilla) {
          const seccionesImportadas = JSON.parse(plantilla.estructura || '[]').map(s => ({
            ...s,
            id: Math.random().toString(36).substr(2, 9),
            partes: s.partes.map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9), asignadoId: null }))
          }));
          datosReunion.secciones.push(...seccionesImportadas);
        }
      });
    }

    const newReunion = {
      id: selectedReunion?.id || Date.now(),
      fecha: formData.get('fecha'),
      tipo: 'Programa Semanal',
      datos_reunion: JSON.stringify(datosReunion)
    };
    const updated = await dataService.saveReunion(newReunion);
    setReuniones(updated);
    setShowReunionModal(false);
    setSelectedReunion(null);
  };

  const handleUpdateWeeklyStructure = async (newDatos) => {
    if (!selectedReunion) return;
    const updatedReunion = {
      ...selectedReunion,
      datos_reunion: JSON.stringify(newDatos)
    };
    const updated = await dataService.saveReunion(updatedReunion);
    setReuniones(updated);
    setSelectedReunion(updatedReunion);
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

  const handleAsignar = async (parteId, personaId) => {
    if (!selectedReunion) return;
    const datos = JSON.parse(selectedReunion.datos_reunion);
    datos.secciones = datos.secciones.map(s => ({
      ...s,
      partes: s.partes.map(p => p.id === parteId ? { ...p, asignadoId: personaId } : p)
    }));

    const updatedReunion = {
      ...selectedReunion,
      datos_reunion: JSON.stringify(datos)
    };
    const updated = await dataService.saveReunion(updatedReunion);
    setReuniones(updated);
    setSelectedReunion(updatedReunion);
  };

  const handleDeleteReunion = async (id) => {
    if (window.confirm('¿Eliminar esta reunión?')) {
      const { apiUrl, spreadsheetId } = dataService.getConfig();
      let updated;
      if (apiUrl) {
        // En un sistema genérico ideal, el backend borraría la fila. 
        // Por ahora, lo manejamos filtrando y guardando la lista completa si fuera necesario, 
        // o implementando una acción 'deleteRow' en la API.
        // Como simplificación para este MVP, borramos local y notificamos.
      }
      updated = reuniones.filter(r => r.id !== id);
      setReuniones(updated);
      if (selectedReunion?.id === id) setSelectedReunion(null);
      localStorage.setItem('jw_reuniones_reuniones', JSON.stringify(updated));
    }
  };

  const handleDeletePlantilla = async (id) => {
    if (window.confirm('¿Eliminar esta plantilla?')) {
      const updated = plantillas.filter(p => p.id !== id);
      setPlantillas(updated);
      localStorage.setItem('jw_reuniones_plantillas', JSON.stringify(updated));
    }
  };

  const handleSaveSala = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newSala = {
      id: editingSala?.id || Date.now(),
      nombre: formData.get('nombre')
    };
    const updated = await dataService.saveSala(newSala);
    setSalas(updated);
    setShowSalaModal(false);
    setEditingSala(null);
  };

  const handleDeleteSala = async (id) => {
    if (window.confirm('¿Eliminar esta sala?')) {
      const updated = salas.filter(s => s.id !== id);
      setSalas(updated);
      localStorage.setItem('jw_reuniones_salas', JSON.stringify(updated));
    }
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
          <a href="#" className={`nav-link ${activeTab === 'plantillas' ? 'active' : ''}`} onClick={() => setActiveTab('plantillas')}>Plantillas</a>
          <a href="#" className={`nav-link ${activeTab === 'salas' ? 'active' : ''}`} onClick={() => setActiveTab('salas')}>Salas</a>
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
              {activeTab === 'dashboard' ? 'Tablero General' :
                activeTab === 'personas' ? 'Gestión de Personas' :
                  activeTab === 'plantillas' ? 'Plantillas de Reunión' :
                    activeTab === 'salas' ? 'Gestión de Salas' : 'Programación Semanal'}
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Sincronizando datos...' : (config.apiUrl ? 'Sincronizado con Google Sheets' : 'Usando almacenamiento local')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {activeTab === 'personas' && (
              <button className="primary" onClick={() => { setEditingPersona(null); setShowModal(true); }}>+ Añadir Persona</button>
            )}
            {activeTab === 'plantillas' && (
              <button className="primary" onClick={() => { setEditingPlantilla(null); setShowPlantillaModal(true); }}>+ Nueva Plantilla</button>
            )}
            {activeTab === 'salas' && (
              <button className="primary" onClick={() => { setEditingSala(null); setShowSalaModal(true); }}>+ Nueva Sala</button>
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
                  <div className="stat-row"><span>Plantillas Disponibles</span><span className="stat-val">{plantillas.length}</span></div>
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

          {activeTab === 'plantillas' && (
            <div className="glass" style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr><th>Nombre (Tipo)</th><th>Secciones</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {plantillas.map(pl => (
                    <tr key={pl.id}>
                      <td style={{ fontWeight: '600' }}>{pl.nombre}</td>
                      <td>{JSON.parse(pl.estructura || '[]').length} secciones</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-icon" onClick={() => { setEditingPlantilla(pl); setShowPlantillaModal(true); }}>✎</button>
                          <button className="btn-icon danger" onClick={() => handleDeletePlantilla(pl.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {plantillas.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center' }}>No hay plantillas creadas.</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'salas' && (
            <div className="glass" style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr><th>Nombre de Sala</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {salas.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: '600' }}>{s.nombre}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-icon" onClick={() => { setEditingSala(s); setShowSalaModal(true); }}>✎</button>
                          <button className="btn-icon danger" onClick={() => handleDeleteSala(s.id)}>🗑</button>
                        </div>
                      </td>
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
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{r.fecha}</span>
                        <small>{r.tipo === 'Vida y Ministerio' ? 'V&M' : 'Fin de Semana'}</small>
                      </div>
                      <button className="btn-icon danger" style={{ padding: '0.2rem', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); handleDeleteReunion(r.id); }}>🗑</button>
                    </div>
                  ))}
                </div>
              </div>

              {selectedReunion && (
                <div className="glass" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h3>Partes de la Reunión ({selectedReunion.fecha})</h3>
                  </div>

                  <div style={{ display: 'grid', gap: '2rem' }}>
                    {JSON.parse(selectedReunion.datos_reunion || '{"secciones":[]}').secciones.map((seccion, sIdx) => (
                      <div key={sIdx} style={{
                        background: seccion.bgColor || 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        padding: '1rem',
                        borderLeft: `5px solid ${seccion.headerColor || 'var(--primary)'}`
                      }}>
                        {seccion.showHeader && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                            <h4 style={{ color: seccion.headerColor || 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{seccion.headerIcon}</span> {seccion.nombre}
                            </h4>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn-icon" style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => {
                                const datos = JSON.parse(selectedReunion.datos_reunion);
                                const nombre = prompt('Nuevo nombre de sección:', seccion.nombre);
                                if (nombre) {
                                  datos.secciones[sIdx].nombre = nombre;
                                  handleUpdateWeeklyStructure(datos);
                                }
                              }}>✎</button>
                              <button className="btn-icon danger" style={{ padding: '0.2rem', fontSize: '0.7rem' }} onClick={() => {
                                if (confirm('¿Eliminar esta sección de la semana?')) {
                                  const datos = JSON.parse(selectedReunion.datos_reunion);
                                  datos.secciones.splice(sIdx, 1);
                                  handleUpdateWeeklyStructure(datos);
                                }
                              }}>×</button>
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {seccion.partes.map((parte, pIdx) => {
                            const asignadoId = parte.asignadoId;
                            const aptos = personas.filter(p => {
                              if (parte.nombre.includes('Oración') || parte.nombre === 'Lectura') return p.genero === 'H';
                              return true;
                            });

                            return (
                              <div key={parte.id} className="stat-row" style={{ alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: '500' }}>{parte.nombre}</span>
                                    <small className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.1)' }}>
                                      {salas.find(s => s.id == parte.salaId)?.nombre || 'Principal'}
                                    </small>
                                    <button className="btn-icon" style={{ fontSize: '0.7rem', padding: '0.1rem' }} onClick={() => {
                                      const datos = JSON.parse(selectedReunion.datos_reunion);
                                      const n = prompt('Nombre de la parte:', parte.nombre);
                                      if (n) {
                                        datos.secciones[sIdx].partes[pIdx].nombre = n;
                                        handleUpdateWeeklyStructure(datos);
                                      }
                                    }}>✎</button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <select
                                      className="minimal-select"
                                      style={{ fontSize: '0.7rem', padding: '0', background: 'none', border: 'none', color: 'var(--text-muted)' }}
                                      value={parte.salaId || 1}
                                      onChange={(e) => {
                                        const datos = JSON.parse(selectedReunion.datos_reunion);
                                        datos.secciones[sIdx].partes[pIdx].salaId = e.target.value;
                                        handleUpdateWeeklyStructure(datos);
                                      }}
                                    >
                                      {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                    {parte.duracion && <small style={{ color: 'var(--text-muted)' }}>{parte.duracion} min</small>}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span style={{ color: asignadoId ? 'var(--text)' : 'var(--danger)', fontSize: '0.9rem', marginRight: '0.5rem' }}>
                                    {getPersonaName(asignadoId)}
                                  </span>
                                  <select
                                    style={{ width: 'auto', padding: '0.3rem', fontSize: '0.85rem' }}
                                    value={asignadoId || ''}
                                    onChange={(e) => handleAsignar(parte.id, e.target.value)}
                                  >
                                    <option value="">Asignar...</option>
                                    {aptos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                  </select>
                                  <button className="btn-icon danger" style={{ padding: '0.2rem' }} onClick={() => {
                                    if (confirm('¿Eliminar esta parte?')) {
                                      const datos = JSON.parse(selectedReunion.datos_reunion);
                                      datos.secciones[sIdx].partes.splice(pIdx, 1);
                                      handleUpdateWeeklyStructure(datos);
                                    }
                                  }}>×</button>
                                </div>
                              </div>
                            );
                          })}
                          <button className="nav-link" style={{ fontSize: '0.8rem', padding: '0.5rem', border: '1px dashed var(--border)', textAlign: 'center' }} onClick={() => {
                            const datos = JSON.parse(selectedReunion.datos_reunion);
                            datos.secciones[sIdx].partes.push({ id: Date.now().toString(), nombre: 'Nueva Parte', duracion: 5, asignadoId: null });
                            handleUpdateWeeklyStructure(datos);
                          }}>+ Añadir parte ad-hoc</button>
                        </div>
                      </div>
                    ))}
                    <button className="primary" style={{ padding: '1rem' }} onClick={() => {
                      const datos = JSON.parse(selectedReunion.datos_reunion);
                      datos.secciones.push({ id: Date.now().toString(), nombre: 'Nueva Sección', showHeader: true, headerColor: '#6366f1', partes: [] });
                      handleUpdateWeeklyStructure(datos);
                    }}>+ Añadir nueva sección a la semana</button>
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
              <div className="form-group">
                <label>Seleccionar Plantillas para esta semana:</label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
                  {plantillas.map(pl => (
                    <label key={pl.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input type="checkbox" name="plantillaIds" value={pl.id} />
                      <span>{pl.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-actions"><button type="button" onClick={() => setShowReunionModal(false)}>Cancelar</button><button type="submit" className="primary">Crear Programa</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Plantilla */}
      {showPlantillaModal && (
        <div className="modal-overlay">
          <div className="glass modal-content" style={{ maxWidth: '600px' }}>
            <h3>{editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
            <form onSubmit={handleSavePlantilla} style={{ marginTop: '1.5rem' }}>
              <div className="form-group"><label>Nombre de la Plantilla (Tipo de Reunión)</label><input name="nombre" defaultValue={editingPlantilla?.nombre} placeholder="Ej: Vida y Ministerio, Reunión Pública..." required /></div>

              <div className="form-group">
                <label>Estructura y Estilo Visual</label>
                <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                  {(editingPlantilla?.estructura ? JSON.parse(editingPlantilla.estructura) : []).map((seccion, sIdx) => (
                    <div key={sIdx} style={{ marginBottom: '2rem', borderLeft: `4px solid ${seccion.headerColor || 'var(--primary)'}`, paddingLeft: '1rem' }}>
                      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            placeholder="Nombre de sección"
                            value={seccion.nombre}
                            style={{ flex: 1, fontWeight: 'bold' }}
                            onChange={(e) => {
                              const est = JSON.parse(editingPlantilla?.estructura || '[]');
                              est[sIdx].nombre = e.target.value;
                              setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                            }}
                          />
                          <button type="button" className="danger" onClick={() => {
                            const est = JSON.parse(editingPlantilla?.estructura || '[]');
                            est.splice(sIdx, 1);
                            setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                          }}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.8rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input type="checkbox" checked={seccion.showHeader} onChange={(e) => {
                              const est = JSON.parse(editingPlantilla?.estructura || '[]');
                              est[sIdx].showHeader = e.target.checked;
                              setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                            }} /> Encabezado
                          </label>
                          <input type="color" value={seccion.headerColor || '#4f46e5'} onChange={(e) => {
                            const est = JSON.parse(editingPlantilla?.estructura || '[]');
                            est[sIdx].headerColor = e.target.value;
                            setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                          }} style={{ width: '30px', height: '20px', padding: 0 }} title="Color Encabezado" />
                          <input type="color" value={seccion.bgColor || 'transparent'} onChange={(e) => {
                            const est = JSON.parse(editingPlantilla?.estructura || '[]');
                            est[sIdx].bgColor = e.target.value;
                            setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                          }} style={{ width: '30px', height: '20px', padding: 0 }} title="Color Fondo" />
                          <input placeholder="Icono (emoji)" value={seccion.headerIcon || ''} maxLength="2" onChange={(e) => {
                            const est = JSON.parse(editingPlantilla?.estructura || '[]');
                            est[sIdx].headerIcon = e.target.value;
                            setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                          }} style={{ width: '40px', padding: '0.2rem' }} />
                        </div>
                      </div>
                      <div style={{ paddingLeft: '1rem', borderLeft: '1px solid var(--border)' }}>
                        {seccion.partes.map((p, pIdx) => (
                          <div key={pIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <input
                              placeholder="Parte"
                              value={p.nombre}
                              style={{ flex: 1 }}
                              onChange={(e) => {
                                const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                est[sIdx].partes[pIdx].nombre = e.target.value;
                                setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                              }}
                            />
                            <select
                              style={{ width: '120px', padding: '0.2rem', fontSize: '0.8rem' }}
                              value={p.salaId || 1}
                              onChange={(e) => {
                                const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                est[sIdx].partes[pIdx].salaId = e.target.value;
                                setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                              }}
                            >
                              {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                            <button type="button" className="danger" onClick={() => {
                              const est = JSON.parse(editingPlantilla?.estructura || '[]');
                              est[sIdx].partes.splice(pIdx, 1);
                              setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                            }}>×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => {
                          const est = JSON.parse(editingPlantilla?.estructura || '[]');
                          est[sIdx].partes.push({ nombre: '', salaId: 1, id: Math.random().toString(36).substr(2, 9) });
                          setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                        }} style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>+ Añadir Parte</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" className="primary" onClick={() => {
                    const est = JSON.parse(editingPlantilla?.estructura || '[]');
                    est.push({ nombre: 'Nueva Sección', showHeader: true, headerColor: '#4f46e5', bgColor: 'transparent', partes: [] });
                    setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                  }}>+ Añadir Sección</button>
                </div>
              </div>

              <div className="modal-actions"><button type="button" onClick={() => setShowPlantillaModal(false)}>Cancelar</button><button type="submit" className="primary">Guardar Plantilla</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Salas */}
      {showSalaModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <h3>{editingSala ? 'Editar Sala' : 'Nueva Sala'}</h3>
            <form onSubmit={handleSaveSala} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Nombre de la Sala</label>
                <input name="nombre" defaultValue={editingSala?.nombre} placeholder="Ej: Sala Principal, Sala B..." required />
              </div>
              <div className="modal-actions"><button type="button" onClick={() => setShowSalaModal(false)}>Cancelar</button><button type="submit" className="primary">Guardar Sala</button></div>
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
                    await dataService.clearData('Plantillas');
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
