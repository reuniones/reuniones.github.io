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
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showPlantillaModal, setShowPlantillaModal] = useState(false);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showTipoAsignacionModal, setShowTipoAsignacionModal] = useState(false);
  const [showReunionModal, setShowReunionModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [editingPlantilla, setEditingPlantilla] = useState(null);
  const [editingSala, setEditingSala] = useState(null);
  const [editingTipoAsignacion, setEditingTipoAsignacion] = useState(null);
  const [selectedReunion, setSelectedReunion] = useState(null);
  const [cloudVersion, setCloudVersion] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Estado temporal para editar estructura de plantilla
  const [tempEstructura, setTempEstructura] = useState([]);

  // Utilidad para parsear JSON de forma segura
  const safeParse = (str, fallback = []) => {
    if (!str || typeof str !== 'string' || str.trim() === '') return fallback;
    try {
      return JSON.parse(str);
    } catch (e) {
      console.warn("Error parsing JSON:", str, e);
      return fallback;
    }
  };

  // Sistema de Temas (Material 3)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.toggle('dark', systemTheme === 'dark');
      } else {
        root.classList.toggle('dark', t === 'dark');
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

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

    const tables = ['Personas', 'Reuniones', 'Plantillas', 'Salas', 'TiposAsignacion'];
    const batch = await dataService.getBatchData(tables);

    if (batch) {
      // Ordenar personas por nombre localmente
      const p = (batch.Personas || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      const r = batch.Reuniones || [];
      const pl = batch.Plantillas || [];
      const sl = batch.Salas || [];
      const ta = batch.TiposAsignacion || [];

      setPersonas(p);
      setReuniones(r);
      setPlantillas(pl);
      setSalas(sl.length > 0 ? sl : [{ id: 1, nombre: 'Principal' }]);
      setTiposAsignacion(ta);
    }

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
    const formData = new FormData(e.target);
    const newPlantilla = {
      id: editingPlantilla?.id || Date.now(),
      nombre: formData.get('nombre'),
      estructura: JSON.stringify(tempEstructura)
    };
    const updated = await dataService.savePlantilla(newPlantilla);
    setPlantillas(updated);
    setShowPlantillaModal(false);
    setEditingPlantilla(null);
    setTempEstructura([]);
  };

  const handleSaveReunion = async (e) => {
    e.preventDefault();
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
      const updated = await dataService.deleteReunion(id);
      setReuniones(updated);
      if (selectedReunion?.id === id) setSelectedReunion(null);
    }
  };

  const handleDeletePersona = async (id) => {
    if (window.confirm('¿Eliminar esta persona?')) {
      const updated = await dataService.deletePersona(id);
      setPersonas(updated);
    }
  };

  const handleDeletePlantilla = async (id) => {
    if (window.confirm('¿Eliminar esta plantilla?')) {
      const updated = await dataService.deletePlantilla(id);
      setPlantillas(updated);
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



  const handleSaveTipoAsignacion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newTipo = {
      id: editingTipoAsignacion?.id || Date.now(),
      nombre: formData.get('nombre')
    };
    const updated = await dataService.saveTipoAsignacion(newTipo);
    setTiposAsignacion(updated);
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
      const updated = await dataService.deleteTipoAsignacion(id);
      setTiposAsignacion(updated);
    }
  };

  const handleDeleteSala = async (id) => {
    if (window.confirm('¿Eliminar esta sala?')) {
      const updated = await dataService.deleteSala(id);
      setSalas(updated);
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
    <div className="flex min-h-screen bg-surface-light dark:bg-surface-dark text-on-surface-light dark:text-on-surface-dark transition-colors duration-300">
      {isSyncing && (
        <div className="fixed top-4 right-4 z-[2000] flex items-center gap-3 bg-white dark:bg-surface-dark border border-primary-light dark:border-primary-dark px-4 py-2 rounded-full shadow-lg animate-fade-in">
          <div className="w-4 h-4 border-2 border-primary-light/20 border-t-primary-light rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Sincronizando...</span>
        </div>
      )}

      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-on-surface-light/30 dark:bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar - Material Navigation Drawer style */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 w-72 h-screen bg-surface-light dark:bg-surface-dark border-r border-outline-light/10 dark:border-outline-dark/10 p-6 flex flex-col transition-transform duration-300 transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary-light dark:bg-primary-dark flex items-center justify-center text-white dark:text-surface-dark shadow-lg">
            <span className="material-icons">event_note</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary-light dark:text-primary-dark">
            Reuniones
          </h1>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'dashboard', label: 'Tablero', icon: 'dashboard' },
            { id: 'personas', label: 'Personas', icon: 'people' },
            { id: 'plantillas', label: 'Plantillas', icon: 'description' },
            { id: 'reuniones', label: 'Programación', icon: 'calendar_month' },
            { id: 'ajustes', label: 'Ajustes', icon: 'tune' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMenuOpen(false);
              }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
                ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark font-semibold'
                : 'text-outline-light hover:bg-surface-light dark:text-outline-dark dark:hover:bg-surface-dark/50'
                }`}
            >
              <span className={`material-icons text-[22px] transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-outline-light/10 dark:border-outline-dark/10">
          <button
            onClick={() => setShowConfigModal(true)}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-outline-light hover:bg-surface-light dark:text-outline-dark dark:hover:bg-surface-dark/50 transition-all group"
          >
            <span className="material-icons text-[22px] group-hover:rotate-45 transition-transform duration-300">settings</span>
            <span className="text-sm">Configuración</span>
          </button>
          <div className="mt-4 flex gap-1 p-1 bg-surface-light dark:bg-white/5 rounded-full border border-outline-light/10">
            {['light', 'system', 'dark'].map(m => (
              <button
                key={m}
                onClick={() => setTheme(m)}
                className={`flex-1 py-1 text-[10px] rounded-full transition-all ${theme === m
                  ? 'bg-white dark:bg-primary-dark text-on-surface-light dark:text-surface-dark shadow-sm'
                  : 'text-on-surface-light/40 hover:text-on-surface-light'
                  }`}
              >
                {m === 'light' ? 'Claro' : m === 'dark' ? 'Oscuro' : 'Auto'}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto overflow-x-hidden">
        {/* Mobile Top Header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 bg-surface-light dark:bg-surface-dark border-b border-outline-light/10 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <span className="material-icons">menu</span>
            </button>
            <span className="font-bold tracking-tight text-primary-light dark:text-primary-dark">Reuniones</span>
          </div>
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <span className="material-icons text-outline-light dark:text-outline-dark">settings</span>
          </button>
        </div>

        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-fade-in">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tighter mb-1">
                {activeTab === 'dashboard' ? 'Tablero' :
                  activeTab === 'personas' ? 'Personas' :
                    activeTab === 'plantillas' ? 'Plantillas' :
                      activeTab === 'ajustes' ? 'Ajustes' : 'Programación'}
              </h1>
              <p className="text-sm text-on-surface-light/60 dark:text-on-surface-dark/60 font-medium">
                {loading ? 'Sincronizando datos...' : (config.apiUrl ? 'Sincronizado con Google Sheets' : 'Usando almacenamiento local')}
              </p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'personas' && (
                <button className="btn-primary flex items-center gap-2" onClick={() => { setEditingPersona(null); setShowModal(true); }}>
                  <span>+</span> Añadir persona
                </button>
              )}
              {activeTab === 'plantillas' && (
                <button className="btn-primary" onClick={() => { setEditingPlantilla(null); setShowPlantillaModal(true); }}>+ Nueva plantilla</button>
              )}
              {activeTab === 'reuniones' && (
                <button className="btn-primary" onClick={() => { setSelectedReunion(null); setShowReunionModal(true); }}>+ Nueva reunión</button>
              )}
            </div>
          </header>

          <div className="space-y-6">
            {(!config.apiUrl || !config.spreadsheetId) && (
              <div className="bg-error-light/10 dark:bg-error-dark/20 border border-error-light/30 p-6 rounded-2xl flex items-start gap-4">
                <span className="material-icons text-error-light dark:text-error-dark">report_problem</span>
                <div>
                  <h3 className="font-bold text-error-light dark:text-error-dark">Configuración requerida</h3>
                  <p className="text-sm opacity-80 mb-4">Por favor, configura la URL de la API y el Spreadsheet ID para comenzar a sincronizar datos.</p>
                  <button className="bg-error-light text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm" onClick={() => setShowConfigModal(true)}>Configurar ahora</button>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                <div className="card shadow-md">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-icons text-primary-light dark:text-primary-dark">analytics</span> Estado de la congregación
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-surface-light dark:bg-white/5">
                      <span className="text-sm opacity-70">Total publicadores</span>
                      <span className="text-xl font-bold text-primary-light dark:text-primary-dark">{personas.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-surface-light dark:bg-white/5">
                      <span className="text-sm opacity-70">Reuniones programadas</span>
                      <span className="text-xl font-bold text-primary-light dark:text-primary-dark">{reuniones.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-surface-light dark:bg-white/5">
                      <span className="text-sm opacity-70">Plantillas Disponibles</span>
                      <span className="text-xl font-bold text-primary-light dark:text-primary-dark">{plantillas.length}</span>
                    </div>
                  </div>
                </div>
                <div className="card shadow-md border-primary-light/20 dark:border-primary-dark/20">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-icons text-primary-light dark:text-primary-dark">campaign</span> Próxima Reunión
                  </h3>
                  {reuniones.length > 0 ? (
                    <div className="p-4 rounded-2xl bg-primary-light/5 dark:bg-primary-dark/10 border border-primary-light/10">
                      <p className="text-lg font-bold text-primary-light dark:text-primary-dark mb-1">{reuniones[0].tipo}</p>
                      <p className="text-2xl font-black tracking-tighter">{reuniones[0].fecha}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 opacity-40 italic">No hay reuniones próximas.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'personas' && (
              <div className="card shadow-md overflow-hidden p-0 animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-light dark:bg-white/5 border-b border-outline-light/10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">Nombre</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">Género</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">Privilegios</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">Habilidades</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-light/5">
                      {personas.map(p => (
                        <tr key={p.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-semibold">{p.nombre}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold ${p.genero === 'H'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                              }`}>
                              {p.genero === 'H' ? 'VARÓN' : 'MUJER'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm opacity-80">{p.privilegios}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {p.habilidades?.map(h => (
                                <span key={h} className="px-2 py-0.5 rounded bg-surface-light dark:bg-white/10 text-[10px] opacity-70 border border-outline-light/10">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="p-2 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingPersona(p); setShowModal(true); }}>
                              <span className="material-icons text-lg group-hover:scale-110 block">edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'plantillas' && (
              <div className="card shadow-md overflow-hidden p-0 animate-fade-in">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-light dark:bg-white/5 border-b border-outline-light/10">
                      <tr>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">Nombre (Tipo)</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60">Secciones</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider opacity-60 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-light/5">
                      {plantillas.map(pl => (
                        <tr key={pl.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-semibold">{pl.nombre}</td>
                          <td className="px-6 py-4 text-sm opacity-80">{safeParse(pl.estructura).length} secciones</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button className="p-2 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => {
                                setEditingPlantilla(pl);
                                setTempEstructura(safeParse(pl.estructura));
                                setShowPlantillaModal(true);
                              }}>
                                <span className="material-icons text-lg group-hover:scale-110 block">edit</span>
                              </button>
                              <button className="p-2 hover:bg-error-light/10 dark:hover:bg-error-dark/20 text-error-light dark:text-error-dark rounded-full transition-colors group" onClick={() => handleDeletePlantilla(pl.id)}>
                                <span className="material-icons text-lg group-hover:scale-110 block">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {plantillas.length === 0 && <tr><td colSpan="3" className="px-6 py-8 text-center opacity-40 italic">No hay plantillas creadas.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'ajustes' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

                {/* Salas */}
                <div className="card shadow-md overflow-hidden p-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-outline-light/10">
                    <h3 className="font-bold flex items-center gap-2">
                      <span className="material-icons text-primary-light dark:text-primary-dark text-xl">meeting_room</span>
                      Salas
                    </h3>
                    <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setEditingSala(null); setShowSalaModal(true); }}>+ Añadir</button>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-outline-light/5">
                      {salas.map(s => (
                        <tr key={s.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3 font-semibold">{s.nombre}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button className="p-2 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingSala(s); setShowSalaModal(true); }}>
                                <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                              </button>
                              <button className="p-2 hover:bg-error-light/10 dark:hover:bg-error-dark/20 text-error-light dark:text-error-dark rounded-full transition-colors group" onClick={() => handleDeleteSala(s.id)}>
                                <span className="material-icons text-base group-hover:scale-110 block">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {salas.length === 0 && <tr><td colSpan="2" className="px-6 py-6 text-center opacity-40 italic">No hay salas definidas.</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Tipos de Asignación */}
                <div className="card shadow-md overflow-hidden p-0">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-outline-light/10">
                    <h3 className="font-bold flex items-center gap-2">
                      <span className="material-icons text-primary-light dark:text-primary-dark text-xl">assignment</span>
                      Tipos de Asignación
                    </h3>
                    <button className="btn-primary text-xs py-1.5 px-3" onClick={() => { setEditingTipoAsignacion(null); setShowTipoAsignacionModal(true); }}>+ Añadir</button>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <tbody className="divide-y divide-outline-light/5">
                      {tiposAsignacion.map(t => (
                        <tr key={t.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3 font-semibold">{t.nombre}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <button className="p-2 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingTipoAsignacion(t); setShowTipoAsignacionModal(true); }}>
                                <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                              </button>
                              <button className="p-2 hover:bg-error-light/10 dark:hover:bg-error-dark/20 text-error-light dark:text-error-dark rounded-full transition-colors group" onClick={() => handleDeleteTipoAsignacion(t.id)}>
                                <span className="material-icons text-base group-hover:scale-110 block">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {tiposAsignacion.length === 0 && <tr><td colSpan="2" className="px-6 py-6 text-center opacity-40 italic">No hay tipos definidos.</td></tr>}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {activeTab === 'reuniones' && (
              <div className="flex flex-col lg:flex-row gap-6 animate-fade-in items-start">
                <div className="card shadow-md w-full lg:w-80 flex-shrink-0">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="material-icons text-primary-light dark:text-primary-dark">calendar_month</span> Listado de Reuniones
                  </h3>
                  <div className="space-y-2">
                    {reuniones.map(r => (
                      <div
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedReunion?.id === r.id
                          ? 'bg-primary-light text-white shadow-md dark:bg-primary-dark dark:text-surface-dark'
                          : 'bg-surface-light dark:bg-white/5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/10'
                          }`}
                        onClick={() => setSelectedReunion(r)}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">{r.fecha}</span>
                          <span className={`text-[10px] font-medium uppercase opacity-70 ${selectedReunion?.id === r.id ? 'text-white/80' : ''}`}>
                            {r.tipo === 'Vida y Ministerio' ? 'Vida y Ministerio' : 'Fin de Semana'}
                          </span>
                        </div>
                        <button
                          className={`p-1.5 rounded-full transition-colors group ${selectedReunion?.id === r.id ? 'hover:bg-white/20' : 'text-error-light hover:bg-error-light/10 dark:text-error-dark dark:hover:bg-error-dark/10'
                            }`}
                          onClick={(e) => { e.stopPropagation(); handleDeleteReunion(r.id); }}
                        >
                          <span className="material-icons text-sm group-hover:scale-110 block">delete</span>
                        </button>
                      </div>
                    ))}
                    {reuniones.length === 0 && <div className="text-center py-8 opacity-40 italic">No hay reuniones.</div>}
                  </div>
                </div>

                {selectedReunion ? (
                  <div className="card shadow-md flex-1 w-full bg-white/50 dark:bg-surface-dark/50">
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-outline-light/10">
                      <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                        <span className="text-primary-light dark:text-primary-dark font-normal">Programa de la semana:</span> {selectedReunion.fecha}
                      </h3>
                    </div>

                    <div className="space-y-8">
                      {safeParse(selectedReunion.datos_reunion, { secciones: [] }).secciones.map((seccion, sIdx) => (
                        <div key={sIdx} className="rounded-3xl overflow-hidden border border-outline-light/10 dark:border-outline-dark/10 bg-white dark:bg-white/5 shadow-sm">
                          {seccion.showHeader !== false && (
                            <div className="px-6 py-4 flex justify-between items-center bg-surface-light dark:bg-white/5 border-b border-outline-light/5"
                              style={{ borderLeft: `6px solid ${seccion.headerColor || 'var(--primary)'}` }}>
                              <h4 className="font-bold flex items-center gap-3" style={{ color: seccion.headerColor }}>
                                <span className="material-icons">{seccion.headerIcon || 'label'}</span> {seccion.nombre}
                              </h4>
                              <button className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors group" onClick={() => {
                                const datos = JSON.parse(selectedReunion.datos_reunion);
                                const nombre = prompt('Nuevo nombre de sección:', seccion.nombre);
                                if (nombre) {
                                  datos.secciones[sIdx].nombre = nombre;
                                  handleUpdateWeeklyStructure(datos);
                                }
                              }}>
                                <span className="material-icons text-xs group-hover:scale-110 block">edit</span>
                              </button>
                              <button className="p-2 hover:bg-error-light/10 text-error-light rounded-full transition-colors group" onClick={() => {
                                if (confirm('¿Eliminar esta sección de la semana?')) {
                                  const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                  datos.secciones.splice(sIdx, 1);
                                  handleUpdateWeeklyStructure(datos);
                                }
                              }}>
                                <span className="material-icons text-xs group-hover:scale-110 block">close</span>
                              </button>
                            </div>
                          )}
                          <div className="divide-y divide-outline-light/5">
                            {seccion.partes.map((parte, pIdx) => {
                              const asignadosIds = parte.asignadosIds || (parte.asignadoId ? [parte.asignadoId] : []);
                              const ayudanteId = parte.ayudanteId;
                              const cupos = parte.cupos || 1;
                              const permiteAyudante = !!parte.permiteAyudante;

                              const aptos = personas.filter(p => {
                                if (parte.nombre.includes('Oración') || parte.nombre === 'Lectura') {
                                  if (p.genero !== 'H') return false;
                                }
                                if (parte.tipoAsignacionIds && parte.tipoAsignacionIds.length > 0) {
                                  const hasRequired = parte.tipoAsignacionIds.some(tid => p.asignaciones?.includes(String(tid)) || p.asignaciones?.includes(Number(tid)));
                                  if (!hasRequired) return false;
                                }
                                return true;
                              });

                              return (
                                <div key={parte.id} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-primary-light/5 dark:hover:bg-primary-dark/5 transition-colors">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className="font-bold text-base">{parte.nombre}</span>
                                      <div className="flex flex-wrap gap-1">
                                        {(parte.salaIds || [1]).map(sid => (
                                          <span key={sid} className="text-[9px] px-2 py-0.5 rounded-full bg-outline-light/10 dark:bg-outline-dark/20 font-bold uppercase opacity-60">
                                            {salas.find(s => s.id == sid)?.nombre || 'Principal'}
                                          </span>
                                        ))}
                                      </div>
                                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-all group" onClick={() => {
                                        const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                        const n = prompt('Nombre de la parte:', parte.nombre);
                                        if (n) {
                                          datos.secciones[sIdx].partes[pIdx].nombre = n;
                                          handleUpdateWeeklyStructure(datos);
                                        }
                                      }}>
                                        <span className="material-icons text-[14px] group-hover:scale-110 block">edit</span>
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2">
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold opacity-40 uppercase">Aptitudes Requeridas</span>
                                        <PillSelector
                                          items={tiposAsignacion}
                                          selectedIds={parte.tipoAsignacionIds || []}
                                          onAdd={(id) => {
                                            const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                            const p = datos.secciones[sIdx].partes[pIdx];
                                            p.tipoAsignacionIds = [...(p.tipoAsignacionIds || []), id];
                                            handleUpdateWeeklyStructure(datos);
                                          }}
                                          onRemove={(id) => {
                                            const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                            const p = datos.secciones[sIdx].partes[pIdx];
                                            p.tipoAsignacionIds = (p.tipoAsignacionIds || []).filter(tid => tid != id);
                                            handleUpdateWeeklyStructure(datos);
                                          }}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[9px] font-bold opacity-40 uppercase">Salas destinadas</span>
                                        <PillSelector
                                          items={salas}
                                          selectedIds={parte.salaIds || [1]}
                                          onAdd={(id) => {
                                            const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                            const p = datos.secciones[sIdx].partes[pIdx];
                                            p.salaIds = [...(p.salaIds || [1]), id];
                                            handleUpdateWeeklyStructure(datos);
                                          }}
                                          onRemove={(id) => {
                                            const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                            const p = datos.secciones[sIdx].partes[pIdx];
                                            p.salaIds = (p.salaIds || [1]).filter(sid => sid != id);
                                            handleUpdateWeeklyStructure(datos);
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-2">
                                      {/* Selectores de asignados principales */}
                                      {Array.from({ length: cupos }).map((_, i) => (
                                        <div key={`asignado-${i}`} className="flex items-center gap-2 justify-end">
                                          <div className={`text-right ${asignadosIds[i] ? 'text-on-surface-light dark:text-on-surface-dark' : 'text-error-light dark:text-error-dark'}`}>
                                            <div className="text-[9px] uppercase font-bold opacity-40 leading-none mb-1">
                                              {cupos > 1 ? `Asignado ${i + 1}` : 'Asignado'}
                                            </div>
                                            <div className="font-bold text-sm tracking-tight">{getPersonaName(asignadosIds[i])}</div>
                                          </div>
                                          <select
                                            className="bg-surface-light dark:bg-white/5 border-none text-xs rounded-xl px-2 py-1.5 outline-none font-bold text-primary-light dark:text-primary-dark cursor-pointer hover:bg-primary-light/10 transition-all mw-[120px]"
                                            value={asignadosIds[i] || ''}
                                            onChange={(e) => {
                                              const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                              const newAsignados = [...(datos.secciones[sIdx].partes[pIdx].asignadosIds || [])];
                                              newAsignados[i] = e.target.value;
                                              datos.secciones[sIdx].partes[pIdx].asignadosIds = newAsignados;
                                              handleUpdateWeeklyStructure(datos);
                                            }}
                                          >
                                            <option value="">Cambiar...</option>
                                            {aptos.filter(p => !asignadosIds.includes(String(p.id)) || String(p.id) === String(asignadosIds[i])).map(p => <option key={p.id} value={p.id} className="text-black">{p.nombre}</option>)}
                                          </select>
                                        </div>
                                      ))}

                                      {/* Selector de ayudante si aplica */}
                                      {permiteAyudante && (
                                        <div className="flex items-center gap-2 justify-end mt-1 pt-2 border-t border-outline-light/10">
                                          <div className={`text-right ${ayudanteId ? 'text-on-surface-light dark:text-on-surface-dark' : 'text-warning-light dark:text-warning-dark'}`}>
                                            <div className="text-[9px] uppercase font-bold opacity-40 leading-none mb-1">Ayudante</div>
                                            <div className="font-bold text-sm tracking-tight">{getPersonaName(ayudanteId)}</div>
                                          </div>
                                          <select
                                            className="bg-surface-light dark:bg-white/5 border-none text-xs rounded-xl px-2 py-1.5 outline-none font-bold text-primary-light dark:text-primary-dark cursor-pointer hover:bg-primary-light/10 transition-all mw-[120px]"
                                            value={ayudanteId || ''}
                                            onChange={(e) => {
                                              const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                              datos.secciones[sIdx].partes[pIdx].ayudanteId = e.target.value;
                                              handleUpdateWeeklyStructure(datos);
                                            }}
                                          >
                                            <option value="">Cambiar...</option>
                                            {personas.filter(p => !asignadosIds.includes(String(p.id)) || String(p.id) === String(ayudanteId)).map(p => <option key={p.id} value={p.id} className="text-black">{p.nombre}</option>)}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                    <button className="p-2 hover:bg-error-light/10 text-error-light rounded-full transition-colors opacity-0 group-hover:opacity-100 group" onClick={() => {
                                      if (confirm('¿Eliminar esta parte?')) {
                                        const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                        datos.secciones[sIdx].partes.splice(pIdx, 1);
                                        handleUpdateWeeklyStructure(datos);
                                      }
                                    }}>
                                      <span className="material-icons text-sm group-hover:scale-110 block">close</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            <button className="w-full py-4 text-xs font-bold opacity-40 hover:opacity-100 hover:bg-surface-light dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 border-t border-outline-light/5 group" onClick={() => {
                              const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                              datos.secciones[sIdx].partes.push({ id: Date.now().toString(), nombre: 'Nueva Parte', cupos: 1, permiteAyudante: false, asignadosIds: [] });
                              handleUpdateWeeklyStructure(datos);
                            }}>
                              <span className="material-icons text-sm group-hover:scale-110">add</span> AÑADIR PARTE AD-HOC
                            </button>
                          </div>
                        </div>
                      ))}
                      <button className="w-full py-6 border-2 border-dashed border-outline-light/20 rounded-3xl opacity-50 hover:opacity-100 hover:border-primary-light/50 transition-all font-bold flex items-center justify-center gap-3 group" onClick={() => {
                        const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                        datos.secciones.push({ id: Date.now().toString(), nombre: 'Nueva Sección', showHeader: true, headerColor: '#6366f1', bgColor: 'transparent', partes: [] });
                        handleUpdateWeeklyStructure(datos);
                      }}>
                        <span className="material-icons text-2xl group-hover:scale-110">add_circle_outline</span> Añadir nueva sección a la semana
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 card shadow-sm opacity-30 text-center">
                    <span className="material-icons text-6xl mb-4">calendar_today</span>
                    <h3 className="text-xl font-bold">Selecciona una reunión</h3>
                    <p className="text-sm">Elige una fecha a la izquierda para ver su programa detallado.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal Genérico Adaptado a Material 3 */}
      {
        [
          {
            show: showModal, title: editingPersona ? 'Editar Persona' : 'Nueva Persona', content: (
              <form onSubmit={handleSavePersona} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold opacity-60 ml-1">NOMBRE COMPLETO</label>
                  <input className="input-field" name="nombre" defaultValue={editingPersona?.nombre} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1">GÉNERO</label>
                    <select className="input-field" name="genero" defaultValue={editingPersona?.genero || 'H'}>
                      <option value="H">Varón</option>
                      <option value="M">Mujer</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1">PRIVILEGIOS</label>
                    <select className="input-field" name="privilegios" defaultValue={editingPersona?.privilegios || 'Publicador'}>
                      <option>Publicador</option>
                      <option>Anciano</option>
                      <option>Siervo Ministerial</option>
                      <option>Precursor</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold opacity-60 ml-1">HABILIDADES (COMAS)</label>
                  <input className="input-field" name="habilidades" defaultValue={editingPersona?.habilidades?.join(', ') || ''} placeholder="Ej: Lectura, Oración..." />
                </div>
                <div className="space-y-1 text-surface-dark dark:text-white">
                  <label className="text-xs font-bold opacity-60 ml-1">APTITUDES DE ASIGNACIÓN</label>
                  <PillSelector
                    items={tiposAsignacion}
                    selectedIds={editingPersona?.asignaciones || []}
                    onAdd={(id) => setEditingPersona({ ...editingPersona, asignaciones: [...(editingPersona?.asignaciones || []), id] })}
                    onRemove={(id) => setEditingPersona({ ...editingPersona, asignaciones: (editingPersona?.asignaciones || []).filter(aid => aid != id) })}
                    placeholder="+ Añadir aptitud"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-outline-light/10 mt-6">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar</button>
                </div>
              </form>
            ), onClose: () => setShowModal(false)
          },
          {
            show: showReunionModal, title: 'Nueva Reunión', content: (
              <form onSubmit={handleSaveReunion} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold opacity-60 ml-1">FECHA DE REUNIÓN</label>
                  <input type="date" className="input-field" name="fecha" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold opacity-60 ml-1">PLANTILLAS PARA ESTA SEMANA</label>
                  <div className="max-h-48 overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                    {plantillas.map(pl => (
                      <label key={pl.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-light dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-outline-light/10 transition-all">
                        <input type="checkbox" name="plantillaIds" value={pl.id} className="w-5 h-5 accent-primary-light" />
                        <span className="font-medium text-sm">{pl.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-outline-light/10 mt-6">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowReunionModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Crear Programa</button>
                </div>
              </form>
            ), onClose: () => setShowReunionModal(false)
          },
          {
            show: showPlantillaModal, title: editingPlantilla ? 'Editar Plantilla' : 'Nueva Plantilla', content: (
              <form onSubmit={handleSavePlantilla} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1 uppercase">Nombre de la Plantilla</label>
                    <input name="nombre" className="input-field" defaultValue={editingPlantilla?.nombre} placeholder="Ej: Entre Semana, Fin de Semana..." required />
                  </div>

                  <div className="space-y-4 border-t border-outline-light/10 pt-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold opacity-60 uppercase">Estructura de la Reunión</h4>
                      <button type="button" className="text-xs btn-primary py-1 px-3" onClick={() => {
                        setTempEstructura([...tempEstructura, { id: Date.now().toString(), nombre: 'Nueva Sección', showHeader: true, headerColor: '#6366f1', partes: [] }]);
                      }}>+ Añadir Sección</button>
                    </div>

                    <div className="space-y-6">
                      {tempEstructura.map((seccion, sIdx) => (
                        <div key={seccion.id} className="p-4 rounded-2xl bg-surface-light dark:bg-white/5 border border-outline-light/10 space-y-4">
                          <div className="flex items-center gap-3">
                            <input
                              className="bg-transparent font-bold border-none outline-none flex-1 focus:ring-1 focus:ring-primary-light rounded px-1"
                              value={seccion.nombre}
                              onChange={(e) => {
                                const newEst = [...tempEstructura];
                                newEst[sIdx].nombre = e.target.value;
                                setTempEstructura(newEst);
                              }}
                            />
                            <input type="color" value={seccion.headerColor} className="w-6 h-6 rounded border-none p-0 cursor-pointer" title="Color del encabezado" onChange={(e) => {
                              const newEst = [...tempEstructura];
                              newEst[sIdx].headerColor = e.target.value;
                              setTempEstructura(newEst);
                            }} />
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={seccion.showHeader !== false}
                                className="w-4 h-4 rounded border-outline-light text-primary-light focus:ring-primary-light"
                                onChange={(e) => {
                                  const newEst = [...tempEstructura];
                                  newEst[sIdx].showHeader = e.target.checked;
                                  setTempEstructura(newEst);
                                }}
                              />
                              <span className="text-[10px] font-bold opacity-60 uppercase">Visible</span>
                            </label>
                            <button type="button" className="text-error-light p-1 hover:bg-error-light/10 rounded-full transition-colors" title="Eliminar sección" onClick={() => {
                              const newEst = [...tempEstructura];
                              newEst.splice(sIdx, 1);
                              setTempEstructura(newEst);
                            }}><span className="material-icons text-sm">delete</span></button>
                          </div>

                          <div className="space-y-2 pl-4 border-l-2 border-outline-light/20">
                            {seccion.partes.map((parte, pIdx) => (
                              <div key={parte.id} className="p-3 rounded-xl bg-white dark:bg-white/5 border border-outline-light/5 space-y-3">
                                <div className="flex gap-2">
                                  <input
                                    className="text-xs font-bold bg-transparent border-none outline-none flex-1 focus:ring-1 focus:ring-primary-light rounded px-1"
                                    value={parte.nombre}
                                    placeholder="Nombre de la parte"
                                    onChange={(e) => {
                                      const newEst = [...tempEstructura];
                                      newEst[sIdx].partes[pIdx].nombre = e.target.value;
                                      setTempEstructura(newEst);
                                    }}
                                  />
                                  <button type="button" className="opacity-40 hover:opacity-100" onClick={() => {
                                    const newEst = [...tempEstructura];
                                    newEst[sIdx].partes.splice(pIdx, 1);
                                    setTempEstructura(newEst);
                                  }}><span className="material-icons text-xs">close</span></button>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-1">
                                  <label className="flex items-center gap-2 cursor-pointer select-none bg-surface-light dark:bg-black/20 px-2 py-1 rounded-lg">
                                    <span className="text-[10px] font-bold opacity-60 uppercase">Asignados</span>
                                    <input
                                      type="number"
                                      min="1"
                                      className="bg-transparent border-none outline-none w-10 text-xs font-bold p-0 text-center"
                                      value={parte.cupos || 1}
                                      onChange={(e) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].cupos = Number(e.target.value);
                                        setTempEstructura(newEst);
                                      }}
                                    />
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer select-none bg-surface-light dark:bg-black/20 px-2 py-1 rounded-lg">
                                    <input
                                      type="checkbox"
                                      checked={!!parte.permiteAyudante}
                                      className="w-4 h-4 rounded border-outline-light text-primary-light focus:ring-primary-light"
                                      onChange={(e) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].permiteAyudante = e.target.checked;
                                        setTempEstructura(newEst);
                                      }}
                                    />
                                    <span className="text-[10px] font-bold opacity-60 uppercase mt-0.5">Permitir Ayudante</span>
                                  </label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-bold opacity-40 uppercase">Aptitudes Requeridas</span>
                                    <PillSelector
                                      items={tiposAsignacion}
                                      selectedIds={parte.tipoAsignacionIds || []}
                                      onAdd={(id) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].tipoAsignacionIds = [...(newEst[sIdx].partes[pIdx].tipoAsignacionIds || []), id];
                                        setTempEstructura(newEst);
                                      }}
                                      onRemove={(id) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].tipoAsignacionIds = (newEst[sIdx].partes[pIdx].tipoAsignacionIds || []).filter(tid => tid != id);
                                        setTempEstructura(newEst);
                                      }}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] font-bold opacity-40 uppercase">Salas</span>
                                    <PillSelector
                                      items={salas}
                                      selectedIds={parte.salaIds || [1]}
                                      onAdd={(id) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].salaIds = [...(newEst[sIdx].partes[pIdx].salaIds || [1]), id];
                                        setTempEstructura(newEst);
                                      }}
                                      onRemove={(id) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].salaIds = (newEst[sIdx].partes[pIdx].salaIds || [1]).filter(sid => sid != id);
                                        setTempEstructura(newEst);
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button type="button" className="text-[10px] font-bold opacity-60 hover:opacity-100 py-1" onClick={() => {
                              const newEst = [...tempEstructura];
                              newEst[sIdx].partes.push({ id: Date.now().toString(), nombre: 'Nueva Parte', cupos: 1, permiteAyudante: false, tipoAsignacionIds: [], salaIds: [1] });
                              setTempEstructura(newEst);
                            }}>+ Añadir Parte</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-outline-light/10">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => { setShowPlantillaModal(false); setTempEstructura([]); }}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Plantilla</button>
                </div>
              </form>
            ), onClose: () => { setShowPlantillaModal(false); setTempEstructura([]); },
            full: true
          },
          {
            show: showSalaModal, title: editingSala ? 'Editar Sala' : 'Nueva Sala', content: (
              <form onSubmit={handleSaveSala} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold opacity-60 ml-1 uppercase">Nombre de la Sala</label>
                  <input name="nombre" className="input-field" defaultValue={editingSala?.nombre} placeholder="Ej: Sala Principal, Sala B..." required />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-light/10">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowSalaModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Sala</button>
                </div>
              </form>
            ), onClose: () => setShowSalaModal(false)
          },
          {
            show: showTipoAsignacionModal, title: editingTipoAsignacion ? 'Editar Tipo' : 'Nuevo Tipo de Asignación', content: (
              <form onSubmit={handleSaveTipoAsignacion} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold opacity-60 ml-1 uppercase">Nombre del Tipo</label>
                  <input name="nombre" className="input-field" defaultValue={editingTipoAsignacion?.nombre} placeholder="Ej: Oración, Lectura..." required />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-outline-light/10">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowTipoAsignacionModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar</button>
                </div>
              </form>
            ), onClose: () => setShowTipoAsignacionModal(false)
          },
          {
            show: showConfigModal, title: 'Configuración del Sistema', content: (
              <form onSubmit={handleSaveConfig} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold opacity-60 ml-1 uppercase">URL de Apps Script</label>
                    <input name="apiUrl" className="input-field py-2 text-xs" defaultValue={config.apiUrl} placeholder="https://..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold opacity-60 ml-1 uppercase">Spreadsheet ID</label>
                    <input name="spreadsheetId" className="input-field py-2 text-xs" defaultValue={config.spreadsheetId} placeholder="ID..." />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowConfigModal(false)}>Cerrar</button>
                  <button type="submit" className="btn-primary">Guardar y Conectar</button>
                </div>
                <div className="mt-8 pt-8 border-t border-outline-light/10 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-40">Mantenimiento Crítico</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <button type="button" onClick={() => handleRecreateTables(true)} className="w-full py-3 bg-surface-light dark:bg-white/5 rounded-xl text-xs font-bold hover:bg-primary-light/10 transition-all border border-outline-light/10 flex items-center justify-center gap-2 group">
                      <span className="material-icons text-sm group-hover:rotate-180 transition-transform duration-500">update</span>
                      Actualizar Estructura (Conservar Datos)
                    </button>
                    <button type="button" onClick={() => handleRecreateTables(false)} className="w-full py-3 bg-error-light/10 text-error-light rounded-xl text-xs font-bold hover:bg-error-light hover:text-white transition-all border border-error-light/20 flex items-center justify-center gap-2 group">
                      <span className="material-icons text-sm group-hover:scale-110">delete_forever</span>
                      Reiniciar Todo (BORRAR DATOS)
                    </button>
                  </div>
                  <div className="text-center opacity-30 text-[9px] font-bold tracking-tighter pt-4">
                    JW GESTOR DE REUNIONES V{dataService.APP_VERSION}
                  </div>
                </div>
              </form>
            ), onClose: () => setShowConfigModal(false)
          },
          {
            show: showVersionModal, title: 'Actualización del Sistema', content: (
              <div className="space-y-6">
                <div className="bg-primary-light/5 dark:bg-white/5 p-5 rounded-3xl border border-primary-light/10">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold opacity-50 uppercase">Versión App</span>
                    <span className="bg-primary-light text-white px-3 py-1 rounded-full text-xs font-black">v{dataService.APP_VERSION}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold opacity-50 uppercase">Versión Nube</span>
                    <span className="bg-error-light/20 text-error-light px-3 py-1 rounded-full text-xs font-black">{cloudVersion ? `v${cloudVersion}` : 'v0.0.0'}</span>
                  </div>
                </div>
                <p className="text-sm opacity-80 leading-relaxed px-2">Se ha detectado un cambio en la estructura interna de datos. Debes actualizar las hojas de Google Sheets para continuar.</p>
                <div className="space-y-3 pt-6 border-t border-outline-light/10">
                  <button onClick={() => handleRecreateTables(true)} className="w-full btn-primary py-4 rounded-3xl shadow-lg">Actualizar y CONSERVAR datos</button>
                  <button onClick={() => handleRecreateTables(false)} className="w-full py-3 bg-error-light/10 text-error-light rounded-2xl text-xs font-bold hover:bg-error-light hover:text-white transition-all">Limpiar y Reiniciar Estructura</button>
                  <button onClick={() => setShowVersionModal(false)} className="w-full py-2 opacity-50 hover:opacity-100 text-xs font-bold underline underline-offset-4">Continuar sin actualizar</button>
                </div>
              </div>
            ), onClose: () => setShowVersionModal(false)
          },
        ].map((m, idx) => m.show && (
          <div key={idx} className={`fixed inset-0 z-[3000] flex items-center justify-center ${m.full ? 'p-0' : 'p-4'} bg-on-surface-light/40 dark:bg-surface-dark/80 backdrop-blur-sm animate-fade-in`}>
            <div className={`bg-white dark:bg-surface-dark w-full shadow-2xl overflow-y-auto custom-scrollbar border border-outline-light/5 dark:border-white/5 ${m.full ? 'modal-full' : 'max-w-lg rounded-[2rem] p-8 max-h-[90vh]'}`}>
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black tracking-tighter">{m.title}</h3>
                <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-light dark:hover:bg-white/5 transition-all text-xl opacity-40 hover:opacity-100 group" onClick={m.onClose}>
                  <span className="material-icons group-hover:scale-110">close</span>
                </button>
              </div>
              {m.content}
            </div>
          </div>
        ))
      }
    </div >
  );
};

export default App;
