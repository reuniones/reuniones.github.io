import React, { useState, useEffect } from 'react';
import { dataService } from './services/dataService';
import './index.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [tiposAsignacion, setTiposAsignacion] = useState([]);
  const [config, setConfig] = useState(dataService.getConfig());
  const [showModal, setShowModal] = useState(false);
  const [showReunionModal, setShowReunionModal] = useState(false);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showTipoAsignacionModal, setShowTipoAsignacionModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [editingPlantilla, setEditingPlantilla] = useState(null);
  const [editingSala, setEditingSala] = useState(null);
  const [editingTipoAsignacion, setEditingTipoAsignacion] = useState(null);
  const [selectedReunion, setSelectedReunion] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [cloudVersion, setCloudVersion] = useState(null);

  const fetchData = async () => {
    setLoading(true);

    // Check version if API is configured
    if (config.apiUrl) {
      const v = await dataService.getAppVersion();
      if (v && v !== dataService.APP_VERSION) {
        setCloudVersion(v);
        setShowVersionModal(true);
        setLoading(false);
        return;
      }
    }

    const p = await dataService.queryData('Personas', '$ ^(nombre)');
    const r = await dataService.getReuniones();
    const pl = await dataService.getPlantillas();
    const sl = await dataService.getSalas();
    const ta = await dataService.getTiposAsignacion();
    setPersonas(p || []);
    setReuniones(r || []);
    setPlantillas(pl || []);
    setSalas(sl.length > 0 ? sl : [{ id: 1, nombre: 'Principal' }]);
    setTiposAsignacion(ta || []);
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
      habilidades: formData.get('habilidades').split(',').map(s => s.trim()).filter(s => s),
      asignaciones: Array.from(e.target.elements.asignaciones || [])
        .filter(input => input.checked)
        .map(input => input.value)
    };
    const updated = await dataService.savePersona(newPersona);
    setPersonas(updated);
    setIsSyncing(false);
    setShowModal(false);
    setEditingPersona(null);
  };

  const handleSavePlantilla = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    const formData = new FormData(e.target);
    const newPlantilla = {
      id: editingPlantilla?.id || Date.now(),
      nombre: formData.get('nombre'),
      estructura: editingPlantilla?.estructura || '[]'
    };
    const updated = await dataService.savePlantilla(newPlantilla);
    setPlantillas(updated);
    setIsSyncing(false);
    setShowPlantillaModal(false);
    setEditingPlantilla(null);
  };

  const handleSaveReunion = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    const formData = new FormData(e.target);
    const selectedTemplateIds = Array.from(e.target.elements.plantillaIds || [])
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
    setIsSyncing(false);
    setShowReunionModal(false);
    setSelectedReunion(null);
  };

  const handleUpdateWeeklyStructure = async (newDatos) => {
    if (!selectedReunion) return;
    setIsSyncing(true);
    const updatedReunion = {
      ...selectedReunion,
      datos_reunion: JSON.stringify(newDatos)
    };
    const updated = await dataService.saveReunion(updatedReunion);
    setReuniones(updated);
    setSelectedReunion(updatedReunion);
    setIsSyncing(false);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    const formData = new FormData(e.target);
    const newConfig = {
      apiUrl: formData.get('apiUrl'),
      spreadsheetId: formData.get('spreadsheetId')
    };
    await dataService.saveConfig(newConfig);
    setConfig(newConfig);
    await dataService.initSheets();
    await fetchData();
    setIsSyncing(false);
    setShowConfigModal(false);
  };

  const handleAsignar = async (parteId, personaId) => {
    if (!selectedReunion) return;
    setIsSyncing(true);
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
    setIsSyncing(false);
  };

  const handleDeleteReunion = async (id) => {
    if (window.confirm('¿Eliminar esta reunión?')) {
      setIsSyncing(true);
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
      setIsSyncing(false);
    }
  };

  const handleDeletePersona = async (id) => {
    if (window.confirm('¿Eliminar esta persona?')) {
      setIsSyncing(true);
      const updated = personas.filter(p => p.id !== id);
      setPersonas(updated);
      localStorage.setItem('jw_reuniones_personas', JSON.stringify(updated));
      setIsSyncing(false);
    }
  };

  const handleDeletePlantilla = async (id) => {
    if (window.confirm('¿Eliminar esta plantilla?')) {
      setIsSyncing(true);
      const updated = plantillas.filter(p => p.id !== id);
      setPlantillas(updated);
      localStorage.setItem('jw_reuniones_plantillas', JSON.stringify(updated));
      setIsSyncing(false);
    }
  };

  const handleSaveSala = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    const formData = new FormData(e.target);
    const newSala = {
      id: editingSala?.id || Date.now(),
      nombre: formData.get('nombre')
    };
    const updated = await dataService.saveSala(newSala);
    setSalas(updated);
    setIsSyncing(false);
    setShowSalaModal(false);
    setEditingSala(null);
  };

  const handleDeleteSala = async (id) => {
    if (window.confirm('¿Eliminar esta sala?')) {
      setIsSyncing(true);
      const updated = salas.filter(s => s.id !== id);
      setSalas(updated);
      localStorage.setItem('jw_reuniones_salas', JSON.stringify(updated));
      setIsSyncing(false);
    }
  };

  const handleSaveTipoAsignacion = async (e) => {
    e.preventDefault();
    setIsSyncing(true);
    const formData = new FormData(e.target);
    const newTipo = {
      id: editingTipoAsignacion?.id || Date.now(),
      nombre: formData.get('nombre')
    };
    const updated = await dataService.saveTipoAsignacion(newTipo);
    setTiposAsignacion(updated);
    setIsSyncing(false);
    setShowTipoAsignacionModal(false);
    setEditingTipoAsignacion(null);
  };

  const handleRecreateTables = async (preserve) => {
    if (window.confirm(preserve ? '¿Recrear tablas conservando los datos actuales?' : '¡ADVERTENCIA! Se borrarán todos los datos. ¿Continuar?')) {
      setIsSyncing(true);
      await dataService.initSheets(preserve);
      setShowVersionModal(false);
      setShowConfigModal(false);
      await fetchData();
      setIsSyncing(false);
    }
  };

  const handleDeleteTipoAsignacion = async (id) => {
    if (window.confirm('¿Eliminar este tipo de asignación?')) {
      setIsSyncing(true);
      const updated = tiposAsignacion.filter(t => t.id !== id);
      setTiposAsignacion(updated);
      localStorage.setItem('jw_reuniones_tipos_asignacion', JSON.stringify(updated));
      setIsSyncing(false);
    }
  };

  const getPersonaName = (id) => personas.find(p => p.id === Number(id))?.nombre || 'Sin asignar';

  const PillSelector = ({ items, selectedIds, onAdd, onRemove, placeholder }) => (
    <div className="pill-container">
      {selectedIds.map(id => {
        const item = items.find(i => i.id == id);
        return item ? (
          <div key={id} className="pill">
            {item.nombre}
            <button type="button" onClick={() => onRemove(id)}>×</button>
          </div>
        ) : null;
      })}
      <select
        value=""
        onChange={(e) => onAdd(e.target.value)}
        className="minimal-select pill-add"
        style={{ width: 'auto', border: 'none', background: 'none' }}
      >
        <option value="" disabled>{placeholder || '+ Añadir'}</option>
        {items.filter(i => !selectedIds.includes(String(i.id)) && !selectedIds.includes(Number(i.id))).map(i => (
          <option key={i.id} value={i.id}>{i.nombre}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="layout">
      {isSyncing && (
        <div className="sync-loader">
          <div className="spinner"></div>
          <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Sincronizando...</span>
        </div>
      )}
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
          <a href="#" className={`nav-link ${activeTab === 'tiposAsignacion' ? 'active' : ''}`} onClick={() => setActiveTab('tiposAsignacion')}>Asignaciones</a>
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
                    activeTab === 'salas' ? 'Gestión de Salas' :
                      activeTab === 'tiposAsignacion' ? 'Tipos de Asignación' : 'Programación Semanal'}
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
            {activeTab === 'tiposAsignacion' && (
              <button className="primary" onClick={() => { setEditingTipoAsignacion(null); setShowTipoAsignacionModal(true); }}>+ Nuevo Tipo</button>
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

          {activeTab === 'tiposAsignacion' && (
            <div className="glass" style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr><th>Nombre del Tipo</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {tiposAsignacion.map(t => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: '600' }}>{t.nombre}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-icon" onClick={() => { setEditingTipoAsignacion(t); setShowTipoAsignacionModal(true); }}>✎</button>
                          <button className="btn-icon danger" onClick={() => handleDeleteTipoAsignacion(t.id)}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {tiposAsignacion.length === 0 && <tr><td colSpan="2" style={{ textAlign: 'center' }}>No hay tipos definidos.</td></tr>}
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
                              // Filtrado por Género (Oración/Lectura)
                              if (parte.nombre.includes('Oración') || parte.nombre === 'Lectura') {
                                if (p.genero !== 'H') return false;
                              }
                              // Filtrado por Tipo de Asignación (debe tener alguna de las requeridas)
                              if (parte.tipoAsignacionIds && parte.tipoAsignacionIds.length > 0) {
                                const hasRequired = parte.tipoAsignacionIds.some(tid => p.asignaciones?.includes(String(tid)) || p.asignaciones?.includes(Number(tid)));
                                if (!hasRequired) return false;
                              }
                              return true;
                            });

                            return (
                              <div key={parte.id} className="stat-row" style={{ alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: '500' }}>{parte.nombre}</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                      {(parte.salaIds || [1]).map(sid => (
                                        <small key={sid} className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem', background: 'rgba(255,255,255,0.1)' }}>
                                          {salas.find(s => s.id == sid)?.nombre || 'Principal'}
                                        </small>
                                      ))}
                                    </div>
                                    <button className="btn-icon" style={{ fontSize: '0.7rem', padding: '0.1rem' }} onClick={() => {
                                      const datos = JSON.parse(selectedReunion.datos_reunion);
                                      const n = prompt('Nombre de la parte:', parte.nombre);
                                      if (n) {
                                        datos.secciones[sIdx].partes[pIdx].nombre = n;
                                        handleUpdateWeeklyStructure(datos);
                                      }
                                    }}>✎</button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <PillSelector
                                      items={salas}
                                      selectedIds={parte.salaIds || [1]}
                                      onAdd={(id) => {
                                        const datos = JSON.parse(selectedReunion.datos_reunion);
                                        datos.secciones[sIdx].partes[pIdx].salaIds = [...(datos.secciones[sIdx].partes[pIdx].salaIds || [1]), id];
                                        handleUpdateWeeklyStructure(datos);
                                      }}
                                      onRemove={(id) => {
                                        const datos = JSON.parse(selectedReunion.datos_reunion);
                                        datos.secciones[sIdx].partes[pIdx].salaIds = (datos.secciones[sIdx].partes[pIdx].salaIds || [1]).filter(sid => sid != id);
                                        handleUpdateWeeklyStructure(datos);
                                      }}
                                    />
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
                      datos.secciones.push({ id: Date.now().toString(), nombre: 'Nueva Sección', showHeader: true, headerColor: '#6366f1', bgColor: 'transparent', partes: [] });
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
                <label>Habilidades (separadas por coma)</label>
                <input name="habilidades" defaultValue={editingPersona?.habilidades?.join(', ') || ''} placeholder="Ej: Lectura, Oración, Discursos" />
              </div>
              <div className="form-group">
                <label>Tipos de Asignación (Apto para:)</label>
                <PillSelector
                  items={tiposAsignacion}
                  selectedIds={editingPersona?.asignaciones || []}
                  onAdd={(id) => setEditingPersona({ ...editingPersona, asignaciones: [...(editingPersona?.asignaciones || []), id] })}
                  onRemove={(id) => setEditingPersona({ ...editingPersona, asignaciones: (editingPersona?.asignaciones || []).filter(aid => aid != id) })}
                  placeholder="+ Añadir aptitud"
                />
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
                            <div style={{ flex: 1, display: 'grid', gap: '0.5rem' }}>
                              <input
                                placeholder="Parte"
                                value={p.nombre}
                                style={{ width: '100%', fontWeight: '500' }}
                                onChange={(e) => {
                                  const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                  est[sIdx].partes[pIdx].nombre = e.target.value;
                                  setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                                }}
                              />
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                  <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Salas:</small>
                                  <PillSelector
                                    items={salas}
                                    selectedIds={p.salaIds || [1]}
                                    onAdd={(id) => {
                                      const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                      est[sIdx].partes[pIdx].salaIds = [...(est[sIdx].partes[pIdx].salaIds || [1]), id];
                                      setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                                    }}
                                    onRemove={(id) => {
                                      const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                      est[sIdx].partes[pIdx].salaIds = (est[sIdx].partes[pIdx].salaIds || [1]).filter(sid => sid != id);
                                      setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                                    }}
                                  />
                                </div>
                                <div>
                                  <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Asignaciones Requeridas:</small>
                                  <PillSelector
                                    items={tiposAsignacion}
                                    selectedIds={p.tipoAsignacionIds || []}
                                    onAdd={(id) => {
                                      const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                      est[sIdx].partes[pIdx].tipoAsignacionIds = [...(est[sIdx].partes[pIdx].tipoAsignacionIds || []), id];
                                      setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                                    }}
                                    onRemove={(id) => {
                                      const est = JSON.parse(editingPlantilla?.estructura || '[]');
                                      est[sIdx].partes[pIdx].tipoAsignacionIds = (est[sIdx].partes[pIdx].tipoAsignacionIds || []).filter(tid => tid != id);
                                      setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
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
                    est.push({ id: Date.now().toString(), nombre: 'Nueva Sección', showHeader: true, headerColor: '#4f46e5', bgColor: 'transparent', partes: [] });
                    setEditingPlantilla({ ...editingPlantilla, estructura: JSON.stringify(est) });
                  }}>+ Añadir Sección</button>
                </div>
              </div>

              <div className="modal-actions"><button type="button" onClick={() => setShowPlantillaModal(false)}>Cancelar</button><button type="submit" className="primary">Guardar Plantilla</button></div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tipo Asignacion */}
      {showTipoAsignacionModal && (
        <div className="modal-overlay">
          <div className="glass modal-content">
            <h3>{editingTipoAsignacion ? 'Editar Tipo' : 'Nuevo Tipo de Asignación'}</h3>
            <form onSubmit={handleSaveTipoAsignacion} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>Nombre del Tipo</label>
                <input name="nombre" defaultValue={editingTipoAsignacion?.nombre} placeholder="Ej: Oración, Lectura, Discurso..." required />
              </div>
              <div className="modal-actions"><button type="button" onClick={() => setShowTipoAsignacionModal(false)}>Cancelar</button><button type="submit" className="primary">Guardar</button></div>
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
          <div className="glass modal-content" style={{ maxWidth: '500px' }}>
            <h3>Configuración del Sistema</h3>
            <form onSubmit={handleSaveConfig} style={{ marginTop: '1.5rem' }}>
              <div className="form-group">
                <label>URL de Apps Script (Web App URL)</label>
                <input name="apiUrl" defaultValue={config.apiUrl} placeholder="https://script.google.com/macros/s/.../exec" />
              </div>
              <div className="form-group">
                <label>Spreadsheet ID</label>
                <input name="spreadsheetId" defaultValue={config.spreadsheetId} placeholder="ID de la hoja de cálculo" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowConfigModal(false)}>Cerrar</button>
                <button type="submit" className="primary">Guardar y Conectar</button>
              </div>

              <hr style={{ margin: '1.5rem 0', opacity: 0.1 }} />

              <h4>Mantenimiento</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Usa estas opciones si necesitas recrear la estructura de las hojas (ej. al actualizar la app).
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button type="button" onClick={() => handleRecreateTables(true)} style={{ fontSize: '0.8rem' }}>
                  Actualizar Estructura (Conservar Datos)
                </button>
                <button type="button" className="danger" onClick={() => handleRecreateTables(false)} style={{ fontSize: '0.8rem' }}>
                  Reiniciar Todo (BORRAR DATOS)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Versión */}
      {showVersionModal && (
        <div className="modal-overlay">
          <div className="glass modal" style={{ maxWidth: '450px', border: '1px solid var(--accent)', padding: '2rem' }}>
            <h2 style={{ color: 'var(--accent)', marginBottom: '1rem' }}>Actualización Necesaria</h2>
            <p>La versión de tu base de datos (<b>{cloudVersion || '0.0.0'}</b>) es antigua.</p>
            <p>La aplicación requiere la versión <b>{dataService.APP_VERSION}</b> para funcionar correctamente.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '2rem' }}>
              <button onClick={() => handleRecreateTables(true)} className="primary">
                Actualizar y CONSERVAR datos
              </button>
              <button onClick={() => handleRecreateTables(false)} className="danger">
                Actualizar y BORRAR TODO (Limpiar)
              </button>
              <button onClick={() => setShowVersionModal(false)} style={{ background: 'none', border: '1px solid var(--text-muted)', color: 'var(--text-muted)' }}>
                Continuar sin actualizar (No recomendado)
              </button>
            </div>
          </div>
        </div>
      )}

      {isSyncing && <SyncLoader />}
    </div>
  );
};

export default App;
