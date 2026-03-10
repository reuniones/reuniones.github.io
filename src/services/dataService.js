import jsonata from 'jsonata';

// Generic Data service for Apps Script or LocalStorage
const STORAGE_KEY_CONFIG = 'jw_reuniones_config';
const STORAGE_KEY_PERSONAS = 'jw_reuniones_personas';
const STORAGE_KEY_REUNIONES = 'jw_reuniones_reuniones';
const STORAGE_KEY_PLANTILLAS = 'jw_reuniones_plantillas';
const STORAGE_KEY_SALAS = 'jw_reuniones_salas';
const STORAGE_KEY_TIPOS_ASIGNACION = 'jw_reuniones_tipos_asignacion';
const STORAGE_KEY_PLANTILLAS_PARTES = 'jw_reuniones_plantillas_partes';
const STORAGE_KEY_ANUNCIOS = 'jw_reuniones_anuncios';

export const APP_VERSION = '1.3.0';

export const dataService = {
  APP_VERSION: APP_VERSION,
  getConfig: () => {
    const config = localStorage.getItem(STORAGE_KEY_CONFIG);
    return config ? JSON.parse(config) : { apiUrl: '', spreadsheetId: '', nombreCongregacion: '' };
  },

  saveConfig: async (config) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    if (config.apiUrl && config.nombreCongregacion) {
      await dataService.saveCloudConfig('nombre_congregacion', config.nombreCongregacion);
    }
    const oldConfig = dataService.getConfig();
    if (config.apiUrl && config.apiUrl !== oldConfig.apiUrl) {
      const cloudVersion = await dataService.getAppVersion();
      if (!cloudVersion) {
        await dataService.initSheets(true);
        await dataService.migrateLocalToCloud();
      }
    }
  },

  saveCloudConfig: async (id, value) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) return;
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'saveData',
          sheet: 'Configuracion',
          ssId: spreadsheetId,
          payload: { id, value }
        })
      });
    } catch (e) {
      console.error(`Error saving cloud config ${id}:`, e);
    }
  },

  getAppVersion: async () => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) return null;
    try {
      const response = await fetch(`${apiUrl}?action=getData&sheet=Configuracion&ssId=${spreadsheetId || ''}`);
      if (!response.ok) return null;
      const data = await response.json();
      if (Array.isArray(data)) {
        const versionItem = data.find(i => i.id === 'app_version');
        return versionItem ? versionItem.value : null;
      }
      return null;
    } catch (e) {
      return null;
    }
  },

  saveAppVersion: async () => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) return;
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'saveData',
          sheet: 'Configuracion',
          ssId: spreadsheetId,
          payload: { id: 'app_version', value: APP_VERSION }
        })
      });
    } catch (e) { }
  },

  initSheets: async (preserveExisting = true) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) return;

    const tables = [
      { name: 'Personas', headers: ['id', 'nombre', 'genero', 'privilegios', 'habilidades', 'asignaciones'] },
      { name: 'Reuniones', headers: ['id', 'fecha', 'tipo', 'datos_reunion'] },
      { name: 'Plantillas', headers: ['id', 'nombre', 'tipo', 'estructura'] },
      { name: 'PlantillasPartes', headers: ['id', 'nombre', 'cupos', 'permiteAyudante', 'permiteLector', 'tipoAsignacionIds', 'salaIds'] },
      { name: 'Salas', headers: ['id', 'nombre'] },
      { name: 'TiposAsignacion', headers: ['id', 'nombre'] },
      { name: 'Anuncios', headers: ['id', 'fecha', 'contenido', 'prioridad'] },
      { name: 'Configuracion', headers: ['id', 'value'] }
    ];

    for (const table of tables) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'initSheet',
            sheet: table.name,
            headers: table.headers,
            ssId: spreadsheetId,
            preserveExisting: preserveExisting
          })
        });
      } catch (e) {
        console.error(`Error initializing sheet ${table.name}:`, e);
      }
    }
    await dataService.saveAppVersion();
  },

  migrateLocalToCloud: async () => {
    const { apiUrl } = dataService.getConfig();
    if (!apiUrl) return;

    const migrationMap = [
      { key: STORAGE_KEY_PERSONAS, sheet: 'Personas' },
      { key: STORAGE_KEY_REUNIONES, sheet: 'Reuniones' },
      { key: STORAGE_KEY_PLANTILLAS, sheet: 'Plantillas' },
      { key: STORAGE_KEY_SALAS, sheet: 'Salas' },
      { key: STORAGE_KEY_TIPOS_ASIGNACION, sheet: 'TiposAsignacion' },
      { key: STORAGE_KEY_PLANTILLAS_PARTES, sheet: 'PlantillasPartes' },
      { key: STORAGE_KEY_ANUNCIOS, sheet: 'Anuncios' }
    ];

    for (const item of migrationMap) {
      const localData = localStorage.getItem(item.key);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          for (const row of parsed) {
            await dataService._save(item.sheet, item.key, row, 'id', true);
          }
        }
      }
    }
  },

  clearData: async (sheetName) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'clearSheet',
            sheet: sheetName,
            ssId: spreadsheetId
          })
        });
      } catch (e) {
        console.error(`Error clearing sheet ${sheetName}:`, e);
      }
    }
    const keys = {
      'Personas': STORAGE_KEY_PERSONAS,
      'Reuniones': STORAGE_KEY_REUNIONES,
      'Plantillas': STORAGE_KEY_PLANTILLAS,
      'Salas': STORAGE_KEY_SALAS,
      'TiposAsignacion': STORAGE_KEY_TIPOS_ASIGNACION,
      'PlantillasPartes': STORAGE_KEY_PLANTILLAS_PARTES,
      'Anuncios': STORAGE_KEY_ANUNCIOS,
      'Configuracion': STORAGE_KEY_CONFIG
    };
    if (keys[sheetName]) localStorage.removeItem(keys[sheetName]);
  },

  getBatchData: async (sheetNames) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        const sheetsParam = sheetNames.join(',');
        const response = await fetch(`${apiUrl}?action=batchGetData&sheets=${sheetsParam}&ssId=${spreadsheetId || ''}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        // Actualizar caché local para cada tabla recibida
        const keys = {
          'Personas': STORAGE_KEY_PERSONAS,
          'Reuniones': STORAGE_KEY_REUNIONES,
          'Plantillas': STORAGE_KEY_PLANTILLAS,
          'Salas': STORAGE_KEY_SALAS,
          'TiposAsignacion': STORAGE_KEY_TIPOS_ASIGNACION,
          'PlantillasPartes': STORAGE_KEY_PLANTILLAS_PARTES,
          'Anuncios': STORAGE_KEY_ANUNCIOS,
          'Configuracion': STORAGE_KEY_CONFIG
        };

        Object.keys(data).forEach(sheet => {
          if (keys[sheet]) {
            if (sheet === 'Configuracion') {
              // Convertir array de {id, value} a objeto plano y fusionar con config actual
              const configRows = data[sheet];
              const currentConfig = dataService.getConfig();
              const cloudConfig = {};
              configRows.forEach(row => {
                if (row.id === 'nombre_congregacion') cloudConfig.nombreCongregacion = row.value;
              });
              const newConfig = { ...currentConfig, ...cloudConfig };
              localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
            } else {
              localStorage.setItem(keys[sheet], JSON.stringify(data[sheet]));
            }
          }
        });

        return data;
      } catch (e) {
        console.error(`Error fetching batch data:`, e);
      }
    }

    // Fallback: cargar individualmente de localStorage
    const result = {};
    const keys = {
      'Personas': STORAGE_KEY_PERSONAS,
      'Reuniones': STORAGE_KEY_REUNIONES,
      'Plantillas': STORAGE_KEY_PLANTILLAS,
      'Salas': STORAGE_KEY_SALAS,
      'TiposAsignacion': STORAGE_KEY_TIPOS_ASIGNACION,
      'PlantillasPartes': STORAGE_KEY_PLANTILLAS_PARTES,
      'Anuncios': STORAGE_KEY_ANUNCIOS,
      'Configuracion': STORAGE_KEY_CONFIG
    };
    sheetNames.forEach(sheet => {
      const local = localStorage.getItem(keys[sheet]);
      result[sheet] = local ? JSON.parse(local) : [];
    });
    return result;
  },

  _get: async (sheet, storageKey) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}?action=getData&sheet=${sheet}&ssId=${spreadsheetId || ''}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        localStorage.setItem(storageKey, JSON.stringify(data)); // Sincronizar local al pedir individual
        return data;
      } catch (e) {
        console.error(`Error fetching ${sheet}:`, e);
      }
    }
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
  },

  // --- Cola de Sincronización Asíncrona (Optimistic UI) ---
  syncQueue: [],
  isProcessingQueue: false,

  processQueue: async () => {
    if (dataService.isProcessingQueue || dataService.syncQueue.length === 0) return;
    dataService.isProcessingQueue = true;

    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) {
      dataService.isProcessingQueue = false;
      return;
    }

    while (dataService.syncQueue.length > 0) {
      const task = dataService.syncQueue[0];
      try {
        const payload = { ...task.payload, ssId: spreadsheetId };
        const response = await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify(payload)
        });

        // Asumimos éxito al completarse el fetch no-cors
        dataService.syncQueue.shift();
      } catch (e) {
        console.error(`Error procesando cola de sincronización:`, e);
        // Rompemos el bucle para reintentar más tarde
        break;
      }
    }

    dataService.isProcessingQueue = false;
  },

  _enqueueSync: (payload) => {
    dataService.syncQueue.push({ payload });
    // Iniciar el procesamiento si no está corriendo
    setTimeout(dataService.processQueue, 100);
  },

  _save: async (sheet, storageKey, payload, idField = 'id', onlyIfNew = false) => {
    // 1. Obtención Inmediata de Local Storage para Actualización Optimista
    const localDataAttr = localStorage.getItem(storageKey);
    const data = localDataAttr ? JSON.parse(localDataAttr) : [];

    // 2. Modificación Local Inmediata
    const index = data.findIndex(item => item[idField] == payload[idField]);
    if (index >= 0) {
      if (!onlyIfNew) data[index] = payload;
    } else {
      data.push(payload);
    }
    localStorage.setItem(storageKey, JSON.stringify(data));

    // 3. Encolar la petición de red (Asíncrona, no bloqueante)
    const { apiUrl } = dataService.getConfig();
    if (apiUrl) {
      dataService._enqueueSync({
        action: 'saveData',
        sheet: sheet,
        payload: payload,
        onlyIfNew: onlyIfNew
      });
    }

    // 4. Devolver la nueva lista inmediatamente
    return data;
  },

  _delete: async (sheet, storageKey, id, idField = 'id') => {
    // 1. Eliminación Local Inmediata
    const localDataAttr = localStorage.getItem(storageKey);
    let data = localDataAttr ? JSON.parse(localDataAttr) : [];
    data = data.filter(item => item[idField] != id);
    localStorage.setItem(storageKey, JSON.stringify(data));

    // 2. Encolar la petición de eliminación a red
    const { apiUrl } = dataService.getConfig();
    if (apiUrl) {
      dataService._enqueueSync({
        action: 'deleteData',
        sheet: sheet,
        id: id
      });
    }

    return data;
  },

  getPersonas: () => dataService._get('Personas', STORAGE_KEY_PERSONAS),
  savePersona: (persona) => dataService._save('Personas', STORAGE_KEY_PERSONAS, persona),
  deletePersona: (id) => dataService._delete('Personas', STORAGE_KEY_PERSONAS, id),

  getReuniones: () => dataService._get('Reuniones', STORAGE_KEY_REUNIONES),
  saveReunion: (reunion) => dataService._save('Reuniones', STORAGE_KEY_REUNIONES, reunion),
  deleteReunion: (id) => dataService._delete('Reuniones', STORAGE_KEY_REUNIONES, id),

  getPlantillas: () => dataService._get('Plantillas', STORAGE_KEY_PLANTILLAS),
  savePlantilla: (plantilla) => dataService._save('Plantillas', STORAGE_KEY_PLANTILLAS, plantilla),
  deletePlantilla: (id) => dataService._delete('Plantillas', STORAGE_KEY_PLANTILLAS, id),

  getSalas: () => dataService._get('Salas', STORAGE_KEY_SALAS),
  saveSala: (sala) => dataService._save('Salas', STORAGE_KEY_SALAS, sala),
  deleteSala: (id) => dataService._delete('Salas', STORAGE_KEY_SALAS, id),

  getPlantillasPartes: () => dataService._get('PlantillasPartes', STORAGE_KEY_PLANTILLAS_PARTES),
  savePlantillaParte: (plantilla) => dataService._save('PlantillasPartes', STORAGE_KEY_PLANTILLAS_PARTES, plantilla),
  deletePlantillaParte: (id) => dataService._delete('PlantillasPartes', STORAGE_KEY_PLANTILLAS_PARTES, id),

  getTiposAsignacion: () => dataService._get('TiposAsignacion', STORAGE_KEY_TIPOS_ASIGNACION),
  saveTipoAsignacion: (tipo) => dataService._save('TiposAsignacion', STORAGE_KEY_TIPOS_ASIGNACION, tipo),
  deleteTipoAsignacion: (id) => dataService._delete('TiposAsignacion', STORAGE_KEY_TIPOS_ASIGNACION, id),

  getAnuncios: () => dataService._get('Anuncios', STORAGE_KEY_ANUNCIOS),
  saveAnuncio: (anuncio) => dataService._save('Anuncios', STORAGE_KEY_ANUNCIOS, anuncio),
  deleteAnuncio: (id) => dataService._delete('Anuncios', STORAGE_KEY_ANUNCIOS, id),

  queryData: async (sheetName, expression) => {
    const data = await (
      sheetName === 'Personas' ? dataService.getPersonas() :
        sheetName === 'Reuniones' ? dataService.getReuniones() :
          sheetName === 'Plantillas' ? dataService.getPlantillas() :
            sheetName === 'Salas' ? dataService.getSalas() :
              sheetName === 'TiposAsignacion' ? dataService.getTiposAsignacion() :
                sheetName === 'PlantillasPartes' ? dataService.getPlantillasPartes() :
                  sheetName === 'Anuncios' ? dataService.getAnuncios() : null
    );
    if (!data) return null;
    try {
      const expr = jsonata(expression);
      return await expr.evaluate(data);
    } catch (e) {
      console.error('JSONata evaluation error:', e);
      return data;
    }
  }
};
