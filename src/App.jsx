import React, { useState, useEffect } from 'react';
import { dataService } from './services/dataService';
import './index.css';
import InicioView from './modules/Inicio/InicioView';
import PredicacionView from './modules/Predicacion/PredicacionView';
import SalonView from './modules/Salon/SalonView';

const App = () => {
  const [activeModule, setActiveModule] = useState('inicio');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [personas, setPersonas] = useState([]);
  const [reuniones, setReuniones] = useState([]);
  const [plantillas, setPlantillas] = useState([]);
  const [plantillasPartes, setPlantillasPartes] = useState([]);
  const [anuncios, setAnuncios] = useState([]);
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
  const [showPlantillaParteModal, setShowPlantillaParteModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState(null);
  const [editingPlantilla, setEditingPlantilla] = useState(null);
  const [editingPlantillaParte, setEditingPlantillaParte] = useState(null);
  const [editingSala, setEditingSala] = useState(null);
  const [editingTipoAsignacion, setEditingTipoAsignacion] = useState(null);
  const [selectedReunion, setSelectedReunion] = useState(null);
  const [cloudVersion, setCloudVersion] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Estado temporal para editar estructura de plantilla
  const [tempEstructura, setTempEstructura] = useState([]);
  const [expandedSections, setExpandedSections] = useState({ personas: true });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Utilidades de Fechas
  const getWeekRange = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar a Lunes
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date) => {
      const day = date.getDate();
      const month = date.toLocaleString('es-ES', { month: 'long' });
      return `${day} de ${month}`;
    };

    return `Semana del ${formatDate(monday)} al ${formatDate(sunday)}`;
  };

  const getUpcomingWeeks = (count = 12) => {
    const weeks = [];
    let current = new Date();
    // Ajustar actual al lunes de esta semana
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);

    for (let i = 0; i < count; i++) {
      weeks.push(getWeekRange(new Date(current)));
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  };


  // Utilidad para parsear JSON de forma segura
  // Utilidad para parsear JSON de forma segura (soporta objetos ya parseados)
  const safeParse = (str, fallback = []) => {
    if (!str) return fallback;
    if (typeof str === 'object') return str; // Ya es un objeto/array
    if (typeof str !== 'string' || str.trim() === '') return fallback;
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

    const tables = ['Personas', 'Reuniones', 'Plantillas', 'PlantillasPartes', 'Salas', 'TiposAsignacion', 'Anuncios', 'Configuracion'];
    const batch = await dataService.getBatchData(tables);

    if (batch) {
      // Ordenar personas por nombre localmente
      const p = (batch.Personas || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      const r = (batch.Reuniones || []).map(item => ({ ...item, datos_reunion: safeParse(item.datos_reunion, { secciones: [] }) }));
      const pl = (batch.Plantillas || []).map(item => ({ ...item, estructura: safeParse(item.estructura, []) }))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      const plp = (batch.PlantillasPartes || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      const sl = (batch.Salas || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      const ta = (batch.TiposAsignacion || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      const an = (batch.Anuncios || []).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')); // Anuncios por fecha descendente

      setPersonas(p);
      setReuniones(r);
      setPlantillas(pl);
      setPlantillasPartes(plp);
      setAnuncios(an);
      setSalas(sl.length > 0 ? sl : [{ id: 1, nombre: 'Principal' }]);
      setTiposAsignacion(ta);
      setConfig(dataService.getConfig());
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

  const handleSavePlantillaParte = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newPlantilla = {
      id: editingPlantillaParte?.id || Date.now(),
      nombre: formData.get('nombre'),
      cupos: Number(formData.get('cupos')),
      permiteAyudante: formData.get('permiteAyudante') === 'on' || formData.get('permiteAyudante') === 'true',
      permiteLector: formData.get('permiteLector') === 'on' || formData.get('permiteLector') === 'true',
      tipoAsignacionIds: editingPlantillaParte?.tipoAsignacionIds || [],
      salaIds: editingPlantillaParte?.salaIds || [1]
    };
    const updated = await dataService.savePlantillaParte(newPlantilla);
    setPlantillasPartes(updated);
    setShowPlantillaParteModal(false);
    setEditingPlantillaParte(null);
  };

  const handleSaveReunion = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedTemplateIds = Array.from(e.target.elements.plantillaIds || [])
      .filter(input => input.checked)
      .map(input => input.value);

    let datosReunion = selectedReunion?.datos_reunion ? safeParse(selectedReunion.datos_reunion, { secciones: [] }) : { secciones: [] };

    if (selectedTemplateIds.length > 0) {
      selectedTemplateIds.forEach(id => {
        const plantilla = plantillas.find(p => p.id == id);
        if (plantilla) {
          const seccionesImportadas = safeParse(plantilla.estructura, []).map(s => ({
            ...s,
            id: Math.random().toString(36).substr(2, 9),
            partes: s.partes.map(p => ({
              ...p,
              id: Math.random().toString(36).substr(2, 9),
              asignaciones: {}
            }))
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
      spreadsheetId: formData.get('spreadsheetId'),
      nombreCongregacion: formData.get('nombreCongregacion')
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
    const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
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

  const handleDeletePlantillaParte = async (id) => {
    if (window.confirm('¿Eliminar esta plantilla de parte?')) {
      const updated = await dataService.deletePlantillaParte(id);
      setPlantillasPartes(updated);
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
        {items
          .filter(i => !selectedIds.includes(String(i.id)) && !selectedIds.includes(Number(i.id)))
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
          .map(i => (
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
          <h1 className="text-xl font-bold tracking-tight text-primary-light dark:text-primary-dark truncate">
            {config.nombreCongregacion || 'Reuniones'}
          </h1>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {/* Módulos Principales */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold opacity-40 uppercase ml-4 mb-2 block">Secciones</span>
            {[
              { id: 'inicio', label: 'Inicio', icon: 'home' },
              { id: 'reuniones', label: 'Reuniones', icon: 'event_note' },
              { id: 'predicacion', label: 'Predicación', icon: 'campaign' },
              { id: 'salon', label: 'Salón del Reino', icon: 'storefront' },
            ].map((mod) => (
              <div key={mod.id}>
                <button
                  onClick={() => {
                    setActiveModule(mod.id);
                    if (mod.id !== 'reuniones') setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${activeModule === mod.id
                    ? 'bg-primary-light/10 text-primary-light dark:bg-primary-dark/10 dark:text-primary-dark font-semibold'
                    : 'text-outline-light hover:bg-surface-light dark:text-outline-dark dark:hover:bg-surface-dark/50'
                    }`}
                >
                  <span className={`material-icons text-[22px] transition-transform duration-200 ${activeModule === mod.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {mod.icon}
                  </span>
                  <span className="text-sm">{mod.label}</span>
                  {mod.id !== 'inicio' && (
                    <span className={`material-icons ml-auto text-xs transition-transform ${activeModule === mod.id ? 'rotate-180' : ''}`}>expand_more</span>
                  )}
                </button>

                {/* Sub-navegación de Reuniones */}
                {mod.id === 'reuniones' && activeModule === 'reuniones' && (
                  <div className="mt-1 ml-6 pl-4 border-l border-outline-light/10 space-y-1 animate-fade-in">
                    {[
                      { id: 'dashboard', label: 'Programa semanal', icon: 'dashboard' },
                      { id: 'reuniones', label: 'Confección', icon: 'calendar_month' },
                      { id: 'ajustes', label: 'Ajustes', icon: 'tune' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === item.id
                          ? 'text-primary-light dark:text-primary-dark font-bold'
                          : 'text-on-surface-light/60 dark:text-on-surface-dark/60 hover:bg-surface-light dark:hover:bg-white/5'
                          }`}
                      >
                        <span className="material-icons text-lg">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sub-navegación de Predicación */}
                {mod.id === 'predicacion' && activeModule === 'predicacion' && (
                  <div className="mt-1 ml-6 pl-4 border-l border-outline-light/10 space-y-1 animate-fade-in">
                    {[
                      { id: 'casa', label: 'De casa en casa', icon: 'home' },
                      { id: 'publica', label: 'Pública', icon: 'groups' },
                      { id: 'telefonica', label: 'Telefónica', icon: 'phone' },
                      { id: 'territorios', label: 'Territorios', icon: 'map' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === item.id
                          ? 'text-primary-light dark:text-primary-dark font-bold'
                          : 'text-on-surface-light/60 dark:text-on-surface-dark/60 hover:bg-surface-light dark:hover:bg-white/5'
                          }`}
                      >
                        <span className="material-icons text-lg">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Sub-navegación de Salón */}
                {mod.id === 'salon' && activeModule === 'salon' && (
                  <div className="mt-1 ml-6 pl-4 border-l border-outline-light/10 space-y-1 animate-fade-in">
                    {[
                      { id: 'mantenimiento', label: 'Mantenimiento', icon: 'handyman' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all ${activeTab === item.id
                          ? 'text-primary-light dark:text-primary-dark font-bold'
                          : 'text-on-surface-light/60 dark:text-on-surface-dark/60 hover:bg-surface-light dark:hover:bg-white/5'
                          }`}
                      >
                        <span className="material-icons text-lg">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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
            <span className="font-bold tracking-tight text-primary-light dark:text-primary-dark truncate max-w-[200px]">
              {config.nombreCongregacion || 'Reuniones'}
            </span>
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
                {activeModule === 'inicio' ? 'Inicio' :
                  activeModule === 'predicacion' ? (
                    activeTab === 'casa' ? 'De casa en casa' :
                      activeTab === 'publica' ? 'Predicación Pública' :
                        activeTab === 'telefonica' ? 'Predicación Telefónica' :
                          activeTab === 'territorios' ? 'Territorios' : 'Predicación'
                  ) :
                    activeModule === 'salon' ? (
                      activeTab === 'mantenimiento' ? 'Plan de mantenimiento' : 'Salón del Reino'
                    ) :
                      (activeTab === 'dashboard' ? 'Programa semanal' :
                        activeTab === 'reuniones' ? 'Confección' :
                          activeTab === 'ajustes' ? 'Ajustes' : 'Reuniones')}
              </h1>
              <p className="text-sm text-on-surface-light/60 dark:text-on-surface-dark/60 font-medium">
                {loading ? 'Sincronizando datos...' : (config.apiUrl ? 'Sincronizado con Google Sheets' : 'Usando almacenamiento local')}
              </p>
            </div>
            <div className="flex gap-3">
              {activeModule === 'reuniones' && activeTab === 'personas' && (
                <button className="btn-primary flex items-center gap-2" onClick={() => { setEditingPersona(null); setShowModal(true); }}>
                  <span>+</span> Añadir persona
                </button>
              )}
              {activeModule === 'reuniones' && activeTab === 'reuniones' && (
                <button className="btn-primary" onClick={() => { setSelectedReunion(null); setShowReunionModal(true); }}>+ Nueva reunión</button>
              )}
            </div>
          </header>

          {/* Alerta de Configuración */}
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

          {/* Módulo Inicio */}
          {activeModule === 'inicio' && <InicioView anuncios={anuncios} />}

          {/* Módulo Predicación */}
          {activeModule === 'predicacion' && <PredicacionView activeTab={activeTab} />}

          {/* Módulo Salón del Reino */}
          {activeModule === 'salon' && <SalonView activeTab={activeTab} />}

          {/* Módulo Reuniones */}
          {activeModule === 'reuniones' && (
            <div className="space-y-6 animate-fade-in">

              {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {reuniones.filter(r => safeParse(r.datos_reunion, {}).publicado).length > 0 ? (
                    reuniones.filter(r => safeParse(r.datos_reunion, {}).publicado).map(reunion => (
                      <div key={reunion.id} className="card shadow-md flex flex-col border border-outline-light/5">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-outline-light/5">
                          <h3 className="font-black text-sm tracking-tight">{reunion.fecha}</h3>
                          <span className="text-[10px] font-black text-success-light uppercase tracking-widest">Publicado</span>
                        </div>
                        <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                          {safeParse(reunion.datos_reunion, { secciones: [] }).secciones.map((sec, sIdx) => (
                            <div key={sIdx} className="space-y-2">
                              {sec.showHeader !== false && (
                                <h4 className="text-[9px] font-black uppercase opacity-30 tracking-widest flex items-center gap-2">
                                  <span className="w-1 h-3 bg-primary-light rounded-full"></span>
                                  {sec.nombre}
                                </h4>
                              )}
                              <div className="space-y-1.5 pl-3">
                                {sec.partes.map((p, pIdx) => (
                                  <div key={pIdx} className="flex flex-col gap-0.5">
                                    <div className="flex justify-between items-start gap-4">
                                      <span className="text-[11px] font-medium opacity-70 leading-tight">{p.nombre}</span>
                                      <div className="flex flex-col items-end">
                                        {Object.entries(p.asignaciones || {}).map(([sId, asig]) => (
                                          <div key={sId} className="flex flex-col items-end leading-none">
                                            <span className="text-[11px] font-black text-on-surface-light dark:text-on-surface-dark">{getPersonaName(asig.personaId)}</span>
                                            {asig.ayudanteId && <span className="text-[9px] opacity-40 italic">con {getPersonaName(asig.ayudanteId)}</span>}
                                            {asig.lectorId && <span className="text-[9px] opacity-40">Lector: {getPersonaName(asig.lectorId)}</span>}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center opacity-40 italic">
                      No hay programas publicados actualmente.
                    </div>
                  )}
                </div>
              )}

              {/* La sección de personas se ha movido dentro de Ajustes */}


              {activeTab === 'ajustes' && (
                <div className="flex flex-col gap-4 animate-fade-in">

                  {/* Sección: Personas */}
                  <div className="card shadow-md overflow-hidden p-0 border border-outline-light/10 dark:border-outline-dark/10">
                    <button
                      onClick={() => toggleSection('personas')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-light dark:hover:bg-white/5 transition-colors"
                    >
                      <h3 className="font-bold flex items-center gap-2">
                        <span className="material-icons text-primary-light dark:text-primary-dark text-xl">people</span>
                        Gestión de Personas
                      </h3>
                      <div className="flex items-center gap-3">
                        <button className="btn-primary text-[10px] py-1 px-2" onClick={(e) => { e.stopPropagation(); setEditingPersona(null); setShowModal(true); }}>+ Añadir</button>
                        <span className={`material-icons transition-transform duration-300 ${expandedSections.personas ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </button>
                    {expandedSections.personas && (
                      <div className="border-t border-outline-light/5 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-surface-light dark:bg-white/5 border-b border-outline-light/10">
                            <tr>
                              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider opacity-60">Nombre</th>
                              <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider opacity-60 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-light/5">
                            {personas.map(p => (
                              <tr key={p.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-2 text-sm font-semibold">{p.nombre}</td>
                                <td className="px-6 py-2 text-right">
                                  <button className="p-1.5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingPersona(p); setShowModal(true); }}>
                                    <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Sección: Plantillas de Reuniones */}
                  <div className="card shadow-md overflow-hidden p-0 border border-outline-light/10 dark:border-outline-dark/10">
                    <button
                      onClick={() => toggleSection('plantillas')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-light dark:hover:bg-white/5 transition-colors"
                    >
                      <h3 className="font-bold flex items-center gap-2">
                        <span className="material-icons text-primary-light dark:text-primary-dark text-xl">description</span>
                        Plantillas de reuniones
                      </h3>
                      <div className="flex items-center gap-3">
                        <button className="btn-primary text-[10px] py-1 px-2" onClick={(e) => { e.stopPropagation(); setEditingPlantilla(null); setTempEstructura([]); setShowPlantillaModal(true); }}>+ Añadir</button>
                        <span className={`material-icons transition-transform duration-300 ${expandedSections.plantillas ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </button>
                    {expandedSections.plantillas && (
                      <div className="border-t border-outline-light/5">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-outline-light/5">
                            {plantillas.map(pl => (
                              <tr key={pl.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-3 text-sm font-semibold">{pl.nombre}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button className="p-1.5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingPlantilla(pl); setTempEstructura(safeParse(pl.estructura)); setShowPlantillaModal(true); }}>
                                      <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                                    </button>
                                    <button className="p-1.5 hover:bg-error-light/10 dark:hover:bg-error-dark/20 text-error-light rounded-full transition-colors group" onClick={() => handleDeletePlantilla(pl.id)}>
                                      <span className="material-icons text-base group-hover:scale-110 block">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Sección: Plantillas de Partes */}
                  <div className="card shadow-md overflow-hidden p-0 border border-outline-light/10 dark:border-outline-dark/10">
                    <button
                      onClick={() => toggleSection('partes')}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-light dark:hover:bg-white/5 transition-colors"
                    >
                      <h3 className="font-bold flex items-center gap-2">
                        <span className="material-icons text-primary-light dark:text-primary-dark text-xl">extension</span>
                        Plantillas de partes
                      </h3>
                      <div className="flex items-center gap-3">
                        <button className="btn-primary text-[10px] py-1 px-2" onClick={(e) => { e.stopPropagation(); setEditingPlantillaParte(null); setShowPlantillaParteModal(true); }}>+ Añadir</button>
                        <span className={`material-icons transition-transform duration-300 ${expandedSections.partes ? 'rotate-180' : ''}`}>expand_more</span>
                      </div>
                    </button>
                    {expandedSections.partes && (
                      <div className="border-t border-outline-light/5">
                        <table className="w-full text-left border-collapse">
                          <tbody className="divide-y divide-outline-light/5">
                            {plantillasPartes.map(pl => (
                              <tr key={pl.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                                <td className="px-6 py-2 text-sm font-semibold">{pl.nombre}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button className="p-1.5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingPlantillaParte(pl); setShowPlantillaParteModal(true); }}>
                                      <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                                    </button>
                                    <button className="p-1.5 hover:bg-error-light/10 dark:hover:bg-error-dark/20 text-error-light rounded-full transition-colors group" onClick={() => handleDeletePlantillaParte(pl.id)}>
                                      <span className="material-icons text-base group-hover:scale-110 block">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Sección: Salas y Tipos */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="card shadow-md overflow-hidden p-0 border border-outline-light/10 dark:border-outline-dark/10">
                      <button onClick={() => toggleSection('salas')} className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                        <h3 className="font-bold flex items-center gap-2">
                          <span className="material-icons text-primary-light dark:text-primary-dark text-xl">meeting_room</span>
                          Salas
                        </h3>
                        <span className={`material-icons transition-transform duration-300 ${expandedSections.salas ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                      {expandedSections.salas && (
                        <div className="border-t border-outline-light/5">
                          <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-outline-light/5">
                              {salas.map(s => (
                                <tr key={s.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-2 text-sm font-semibold">{s.nombre}</td>
                                  <td className="px-4 py-2 text-right">
                                    <button className="p-1.5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingSala(s); setShowSalaModal(true); }}>
                                      <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="card shadow-md overflow-hidden p-0 border border-outline-light/10 dark:border-outline-dark/10">
                      <button onClick={() => toggleSection('tipos')} className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                        <h3 className="font-bold flex items-center gap-2">
                          <span className="material-icons text-primary-light dark:text-primary-dark text-xl">assignment</span>
                          Tipos
                        </h3>
                        <span className={`material-icons transition-transform duration-300 ${expandedSections.tipos ? 'rotate-180' : ''}`}>expand_more</span>
                      </button>
                      {expandedSections.tipos && (
                        <div className="border-t border-outline-light/5">
                          <table className="w-full text-left border-collapse">
                            <tbody className="divide-y divide-outline-light/5">
                              {tiposAsignacion.map(t => (
                                <tr key={t.id} className="hover:bg-surface-light dark:hover:bg-white/5 transition-colors">
                                  <td className="px-6 py-2 text-sm font-semibold">{t.nombre}</td>
                                  <td className="px-4 py-2 text-right">
                                    <button className="p-1.5 hover:bg-primary-light/10 dark:hover:bg-primary-dark/20 rounded-full transition-colors group" onClick={() => { setEditingTipoAsignacion(t); setShowTipoAsignacionModal(true); }}>
                                      <span className="material-icons text-base group-hover:scale-110 block">edit</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
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
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-outline-light/10">
                        <div>
                          <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                            <span className="text-primary-light dark:text-primary-dark font-normal">Programa de la semana:</span> {selectedReunion.fecha}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={!!safeParse(selectedReunion.datos_reunion, {}).publicado}
                                onChange={(e) => {
                                  const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                  datos.publicado = e.target.checked;
                                  handleUpdateWeeklyStructure(datos);
                                }}
                              />
                              <div className={`block w-10 h-6 rounded-full transition-colors ${safeParse(selectedReunion.datos_reunion, {}).publicado ? 'bg-primary-light' : 'bg-outline-light/30'}`}></div>
                              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${safeParse(selectedReunion.datos_reunion, {}).publicado ? 'translate-x-4' : ''}`}></div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">{safeParse(selectedReunion.datos_reunion, {}).publicado ? 'Publicado' : 'Borrador'}</span>
                          </label>
                          <button
                            className="btn-primary text-xs py-2 px-4 flex items-center gap-2"
                            onClick={() => {
                              const listaNames = plantillasPartes.map(p => p.nombre).join(', ');
                              const name = prompt('Nombre de la parte a añadir:\n(Disponibles: ' + listaNames + ')');
                              if (name) {
                                const plp = plantillasPartes.find(p => p.nombre.toLowerCase().includes(name.toLowerCase()));
                                if (plp) {
                                  const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                  if (datos.secciones.length === 0) datos.secciones.push({ nombre: 'Adicional', partes: [] });
                                  datos.secciones[0].partes.push({
                                    id: Date.now().toString(),
                                    nombre: plp.nombre,
                                    salaIds: plp.salaIds || [1],
                                    tipoAsignacionIds: plp.tipoAsignacionIds || [],
                                    permiteAyudante: plp.permiteAyudante,
                                    permiteLector: plp.permiteLector,
                                    asignaciones: {}
                                  });
                                  handleUpdateWeeklyStructure(datos);
                                } else {
                                  alert('No se encontró una plantilla con ese nombre.');
                                }
                              }
                            }}
                          >
                            <span className="material-icons text-sm">add</span> Añadir Parte
                          </button>
                        </div>
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
                                const salaIds = parte.salaIds || [1];
                                const asignaciones = parte.asignaciones || {}; // { salaId: { personaId, ayudanteId, lectorId } }

                                return (
                                  <div key={parte.id || pIdx} className="p-6 transition-all hover:bg-surface-light dark:hover:bg-white/[0.02]">
                                    <div className="flex flex-col gap-6">
                                      {/* Cabecera de la Parte */}
                                      <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-3">
                                            <h5 className="font-black text-lg tracking-tight">{parte.nombre}</h5>
                                            <button className="opacity-40 hover:opacity-100 transition-opacity" onClick={() => {
                                              const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                              const n = prompt('Nombre de la parte:', parte.nombre);
                                              if (n) {
                                                datos.secciones[sIdx].partes[pIdx].nombre = n;
                                                handleUpdateWeeklyStructure(datos);
                                              }
                                            }}>
                                              <span className="material-icons text-sm">edit</span>
                                            </button>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {parte.tipoAsignacionIds?.map(taId => (
                                              <span key={taId} className="text-[9px] px-2 py-0.5 rounded-full bg-primary-light/10 text-primary-light font-black uppercase tracking-tighter">
                                                {tiposAsignacion.find(t => t.id == taId)?.nombre}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                        <button className="p-2 hover:bg-error-light/10 text-error-light rounded-full transition-colors group" onClick={() => {
                                          if (confirm('¿Eliminar esta parte?')) {
                                            const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                            datos.secciones[sIdx].partes.splice(pIdx, 1);
                                            handleUpdateWeeklyStructure(datos);
                                          }
                                        }}>
                                          <span className="material-icons text-xs group-hover:scale-110 block">delete</span>
                                        </button>
                                      </div>

                                      {/* Asignaciones por Sala */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {salaIds.map(sId => {
                                          const sala = salas.find(s => s.id == sId);
                                          const asignacion = asignaciones[sId] || {};

                                          // Filtrar personas aptas
                                          const aptos = personas.filter(p => {
                                            if (!parte.tipoAsignacionIds || parte.tipoAsignacionIds.length === 0) return true;
                                            return p.tipoAsignacionIds?.some(taId => parte.tipoAsignacionIds.includes(taId));
                                          });

                                          return (
                                            <div key={sId} className="bg-surface-light dark:bg-white/[0.03] p-5 rounded-[2rem] border border-outline-light/10 dark:border-white/5 space-y-4">
                                              <div className="flex items-center gap-2 mb-2 px-1">
                                                <span className="material-icons text-primary-light text-sm">meeting_room</span>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{sala?.nombre || 'Sala Principal'}</span>
                                              </div>

                                              <div className="space-y-4">
                                                {/* Selector Principal */}
                                                <div className="space-y-1">
                                                  <div className="flex justify-between items-center px-1">
                                                    <label className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Asignado</label>
                                                    {asignacion.personaId && <span className="text-[10px] font-black text-primary-light">✓</span>}
                                                  </div>
                                                  <select
                                                    className={`input-field py-2.5 text-xs font-bold rounded-2xl ${!asignacion.personaId ? 'border-error-light/30 text-error-light' : ''}`}
                                                    value={asignacion.personaId || ''}
                                                    onChange={(e) => {
                                                      const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                                      if (!datos.secciones[sIdx].partes[pIdx].asignaciones) datos.secciones[sIdx].partes[pIdx].asignaciones = {};
                                                      if (!datos.secciones[sIdx].partes[pIdx].asignaciones[sId]) datos.secciones[sIdx].partes[pIdx].asignaciones[sId] = {};
                                                      datos.secciones[sIdx].partes[pIdx].asignaciones[sId].personaId = e.target.value;
                                                      handleUpdateWeeklyStructure(datos);
                                                    }}
                                                  >
                                                    <option value="">(SIN ASIGNAR)</option>
                                                    {aptos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                  </select>
                                                </div>

                                                {/* Ayudante */}
                                                {parte.permiteAyudante && (
                                                  <div className="space-y-1 animate-fade-in">
                                                    <label className="text-[9px] font-bold opacity-30 uppercase ml-1 tracking-widest flex items-center gap-1">
                                                      <span className="material-icons text-[10px]">person_add</span> Ayudante
                                                    </label>
                                                    <select
                                                      className="input-field py-2 text-xs rounded-2xl border-dashed"
                                                      value={asignacion.ayudanteId || ''}
                                                      onChange={(e) => {
                                                        const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                                        if (!datos.secciones[sIdx].partes[pIdx].asignaciones) datos.secciones[sIdx].partes[pIdx].asignaciones = {};
                                                        if (!datos.secciones[sIdx].partes[pIdx].asignaciones[sId]) datos.secciones[sIdx].partes[pIdx].asignaciones[sId] = {};
                                                        datos.secciones[sIdx].partes[pIdx].asignaciones[sId].ayudanteId = e.target.value;
                                                        handleUpdateWeeklyStructure(datos);
                                                      }}
                                                    >
                                                      <option value="">(Opcional)</option>
                                                      {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                    </select>
                                                  </div>
                                                )}

                                                {/* Lector */}
                                                {parte.permiteLector && (
                                                  <div className="space-y-1 animate-fade-in">
                                                    <label className="text-[9px] font-bold opacity-30 uppercase ml-1 tracking-widest flex items-center gap-1">
                                                      <span className="material-icons text-[10px]">menu_book</span> Lector
                                                    </label>
                                                    <select
                                                      className="input-field py-2 text-xs rounded-2xl border-dotted"
                                                      value={asignacion.lectorId || ''}
                                                      onChange={(e) => {
                                                        const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                                        if (!datos.secciones[sIdx].partes[pIdx].asignaciones) datos.secciones[sIdx].partes[pIdx].asignaciones = {};
                                                        if (!datos.secciones[sIdx].partes[pIdx].asignaciones[sId]) datos.secciones[sIdx].partes[pIdx].asignaciones[sId] = {};
                                                        datos.secciones[sIdx].partes[pIdx].asignaciones[sId].lectorId = e.target.value;
                                                        handleUpdateWeeklyStructure(datos);
                                                      }}
                                                    >
                                                      <option value="">(Opcional)</option>
                                                      {personas.filter(p => p.genero === 'H').map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                                                    </select>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <button className="w-full py-4 text-xs font-bold opacity-40 hover:opacity-100 hover:bg-surface-light dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 border-t border-outline-light/5 group" onClick={() => {
                                const datos = safeParse(selectedReunion.datos_reunion, { secciones: [] });
                                datos.secciones[sIdx].partes.push({ id: Date.now().toString(), nombre: 'Nueva Parte', cupos: 1, permiteAyudante: false, permiteLector: false, asignadosIds: [] });
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
          )}
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
                            <div className="flex gap-1 border-x border-outline-light/10 px-2">
                              <button
                                type="button"
                                disabled={sIdx === 0}
                                className={`p-1 rounded-full transition-colors ${sIdx === 0 ? 'opacity-20' : 'hover:bg-primary-light/10 text-primary-light'}`}
                                onClick={() => {
                                  const newEst = [...tempEstructura];
                                  [newEst[sIdx], newEst[sIdx - 1]] = [newEst[sIdx - 1], newEst[sIdx]];
                                  setTempEstructura(newEst);
                                }}
                              >
                                <span className="material-icons text-sm">arrow_upward</span>
                              </button>
                              <button
                                type="button"
                                disabled={sIdx === tempEstructura.length - 1}
                                className={`p-1 rounded-full transition-colors ${sIdx === tempEstructura.length - 1 ? 'opacity-20' : 'hover:bg-primary-light/10 text-primary-light'}`}
                                onClick={() => {
                                  const newEst = [...tempEstructura];
                                  [newEst[sIdx], newEst[sIdx + 1]] = [newEst[sIdx + 1], newEst[sIdx]];
                                  setTempEstructura(newEst);
                                }}
                              >
                                <span className="material-icons text-sm">arrow_downward</span>
                              </button>
                            </div>
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
                                  <div className="flex gap-1 items-center">
                                    <button
                                      type="button"
                                      disabled={pIdx === 0}
                                      className={`p-1 rounded-full transition-colors ${pIdx === 0 ? 'opacity-20' : 'hover:bg-primary-light/10 text-primary-light'}`}
                                      onClick={() => {
                                        const newEst = [...tempEstructura];
                                        const partes = [...newEst[sIdx].partes];
                                        [partes[pIdx], partes[pIdx - 1]] = [partes[pIdx - 1], partes[pIdx]];
                                        newEst[sIdx].partes = partes;
                                        setTempEstructura(newEst);
                                      }}
                                    >
                                      <span className="material-icons text-xs">arrow_upward</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={pIdx === seccion.partes.length - 1}
                                      className={`p-1 rounded-full transition-colors ${pIdx === seccion.partes.length - 1 ? 'opacity-20' : 'hover:bg-primary-light/10 text-primary-light'}`}
                                      onClick={() => {
                                        const newEst = [...tempEstructura];
                                        const partes = [...newEst[sIdx].partes];
                                        [partes[pIdx], partes[pIdx + 1]] = [partes[pIdx + 1], partes[pIdx]];
                                        newEst[sIdx].partes = partes;
                                        setTempEstructura(newEst);
                                      }}
                                    >
                                      <span className="material-icons text-xs">arrow_downward</span>
                                    </button>
                                  </div>
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
                                    <span className="text-[10px] font-bold opacity-60 uppercase mt-0.5">Requiere ayudante</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer select-none bg-surface-light dark:bg-black/20 px-2 py-1 rounded-lg">
                                    <input
                                      type="checkbox"
                                      checked={!!parte.permiteLector}
                                      className="w-4 h-4 rounded border-outline-light text-primary-light focus:ring-primary-light"
                                      onChange={(e) => {
                                        const newEst = [...tempEstructura];
                                        newEst[sIdx].partes[pIdx].permiteLector = e.target.checked;
                                        setTempEstructura(newEst);
                                      }}
                                    />
                                    <span className="text-[10px] font-bold opacity-60 uppercase mt-0.5">Requiere lector</span>
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
            show: showPlantillaParteModal, title: editingPlantillaParte ? 'Editar Plantilla de Parte' : 'Nueva Plantilla de Parte', content: (
              <form onSubmit={handleSavePlantillaParte} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1 uppercase">Nombre de la Plantilla</label>
                    <input name="nombre" className="input-field" defaultValue={editingPlantillaParte?.nombre} placeholder="Ej: Lectura, Oración..." required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold opacity-60 ml-1 uppercase">Cupos (Asignados)</label>
                      <input type="number" name="cupos" min="1" className="input-field" defaultValue={editingPlantillaParte?.cupos || 1} required />
                    </div>
                    <div className="flex flex-col gap-3 pt-4">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="permiteAyudante"
                          defaultChecked={!!editingPlantillaParte?.permiteAyudante}
                          className="w-5 h-5 rounded border-outline-light text-primary-light focus:ring-primary-light"
                        />
                        <span className="text-sm font-bold opacity-60 uppercase">Requiere ayudante</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          name="permiteLector"
                          defaultChecked={!!editingPlantillaParte?.permiteLector}
                          className="w-5 h-5 rounded border-outline-light text-primary-light focus:ring-primary-light"
                        />
                        <span className="text-sm font-bold opacity-60 uppercase">Requiere lector</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1 uppercase">Aptitudes Requeridas</label>
                    <PillSelector
                      items={tiposAsignacion}
                      selectedIds={editingPlantillaParte?.tipoAsignacionIds || []}
                      onAdd={(id) => setEditingPlantillaParte({
                        ...editingPlantillaParte,
                        tipoAsignacionIds: [...(editingPlantillaParte?.tipoAsignacionIds || []), id]
                      })}
                      onRemove={(id) => setEditingPlantillaParte({
                        ...editingPlantillaParte,
                        tipoAsignacionIds: (editingPlantillaParte?.tipoAsignacionIds || []).filter(aid => aid != id)
                      })}
                      placeholder="+ Añadir aptitud"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1 uppercase">Salas Permitidas</label>
                    <PillSelector
                      items={salas}
                      selectedIds={editingPlantillaParte?.salaIds || [1]}
                      onAdd={(id) => setEditingPlantillaParte({
                        ...editingPlantillaParte,
                        salaIds: [...(editingPlantillaParte?.salaIds || [1]), id]
                      })}
                      onRemove={(id) => setEditingPlantillaParte({
                        ...editingPlantillaParte,
                        salaIds: (editingPlantillaParte?.salaIds || [1]).filter(sid => sid != id)
                      })}
                      placeholder="+ Añadir sala"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-outline-light/10">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowPlantillaParteModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Plantilla</button>
                </div>
              </form>
            ), onClose: () => setShowPlantillaParteModal(false)
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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold opacity-60 ml-1 uppercase">Nombre de la Congregación</label>
                    <input name="nombreCongregacion" className="input-field py-2 text-xs" defaultValue={config.nombreCongregacion} placeholder="Ej: Congregación Centro..." />
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
          {
            show: showReunionModal, title: 'Nueva Reunión Semanal', content: (
              <form onSubmit={handleSaveReunion} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold opacity-60 ml-1 uppercase">Seleccionar Semana</label>
                    <select name="week" className="input-field" required>
                      {getUpcomingWeeks().map((w, i) => (
                        <option key={i} value={w}>{w}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold opacity-60 ml-1 uppercase">Plantillas de Reunión (Aplicar)</label>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border border-outline-light/10 rounded-xl">
                      {plantillas.map(pl => (
                        <label key={pl.id} className="flex items-center gap-3 p-3 bg-surface-light dark:bg-white/5 rounded-xl cursor-pointer hover:bg-primary-light/5 transition-all">
                          <input type="checkbox" name="templateIds" value={pl.id} className="w-5 h-5 rounded border-outline-light text-primary-light" />
                          <span className="text-sm font-bold">{pl.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" className="px-6 py-2.5 rounded-full font-bold opacity-60 hover:opacity-100 transition-all" onClick={() => setShowReunionModal(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={isSyncing}>
                    {isSyncing ? 'Creando...' : 'Crear Programa'}
                  </button>
                </div>
              </form>
            ), onClose: () => setShowReunionModal(false)
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
