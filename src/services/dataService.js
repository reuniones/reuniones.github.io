import jsonata from 'jsonata';

// Generic Data service for Apps Script or LocalStorage
const STORAGE_KEY_CONFIG = 'jw_reuniones_config';
const STORAGE_KEY_PERSONAS = 'jw_reuniones_personas';
const STORAGE_KEY_REUNIONES = 'jw_reuniones_reuniones';
const STORAGE_KEY_PLANTILLAS = 'jw_reuniones_plantillas';
const STORAGE_KEY_SALAS = 'jw_reuniones_salas';

export const dataService = {
  getConfig: () => {
    const config = localStorage.getItem(STORAGE_KEY_CONFIG);
    return config ? JSON.parse(config) : { apiUrl: '', spreadsheetId: '' };
  },

  saveConfig: async (config) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    if (config.apiUrl) {
      try {
        await fetch(config.apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'saveData',
            sheet: 'Configuracion',
            ssId: config.spreadsheetId,
            payload: { id: 'app_config', value: JSON.stringify(config) }
          })
        });
      } catch (e) {
        console.error('Error saving config to cloud:', e);
      }
    }
  },

  initSheets: async () => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) return;

    const tables = [
      { name: 'Personas', headers: ['id', 'nombre', 'genero', 'privilegios', 'habilidades'] },
      { name: 'Reuniones', headers: ['id', 'fecha', 'tipo', 'datos_reunion'] },
      { name: 'Plantillas', headers: ['id', 'nombre', 'tipo', 'estructura'] },
      { name: 'Salas', headers: ['id', 'nombre'] },
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
            ssId: spreadsheetId
          })
        });
      } catch (e) {
        console.error(`Error initializing sheet ${table.name}:`, e);
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
      'Salas': STORAGE_KEY_SALAS
    };
    if (keys[sheetName]) localStorage.removeItem(keys[sheetName]);
  },

  // Generic Get/Save
  _get: async (sheet, storageKey) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}?action=getData&sheet=${sheet}&ssId=${spreadsheetId || ''}`, {
          method: 'GET',
          redirect: 'follow'
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
      } catch (e) {
        console.error(`Error fetching ${sheet}:`, e);
      }
    }
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
  },

  _save: async (sheet, storageKey, payload, idField = 'id') => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'saveData',
            sheet: sheet,
            payload: payload,
            ssId: spreadsheetId
          })
        });
      } catch (e) {
        console.error(`Error saving ${sheet}:`, e);
      }
    }
    const data = await dataService._get(sheet, storageKey);
    const index = data.findIndex(item => item[idField] == payload[idField]);
    if (index >= 0) data[index] = payload; else data.push(payload);
    localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  },

  getPersonas: () => dataService._get('Personas', STORAGE_KEY_PERSONAS),
  savePersona: (persona) => dataService._save('Personas', STORAGE_KEY_PERSONAS, persona),

  getReuniones: () => dataService._get('Reuniones', STORAGE_KEY_REUNIONES),
  saveReunion: (reunion) => dataService._save('Reuniones', STORAGE_KEY_REUNIONES, reunion),

  getPlantillas: () => dataService._get('Plantillas', STORAGE_KEY_PLANTILLAS),
  savePlantilla: (plantilla) => dataService._save('Plantillas', STORAGE_KEY_PLANTILLAS, plantilla),

  getSalas: () => dataService._get('Salas', STORAGE_KEY_SALAS),
  saveSala: (sala) => dataService._save('Salas', STORAGE_KEY_SALAS, sala),

  queryData: async (sheetName, expression) => {
    const data = await (
      sheetName === 'Personas' ? dataService.getPersonas() :
        sheetName === 'Reuniones' ? dataService.getReuniones() :
          sheetName === 'Plantillas' ? dataService.getPlantillas() :
            sheetName === 'Salas' ? dataService.getSalas() : null
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
