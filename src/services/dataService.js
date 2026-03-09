import jsonata from 'jsonata';

// Generic Data service for Apps Script or LocalStorage
const STORAGE_KEY_CONFIG = 'jw_reuniones_config';
const STORAGE_KEY_PERSONAS = 'jw_reuniones_personas';
const STORAGE_KEY_REUNIONES = 'jw_reuniones_reuniones';

export const dataService = {
  getConfig: () => {
    const config = localStorage.getItem(STORAGE_KEY_CONFIG);
    return config ? JSON.parse(config) : { apiUrl: '', spreadsheetId: '' };
  },

  saveConfig: async (config) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    // Save to Google Sheet if possible
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

  // Initialize sheets if API is present
  initSheets: async () => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (!apiUrl) return;

    const tables = [
      { name: 'Personas', headers: ['id', 'nombre', 'genero', 'privilegios', 'habilidades'] },
      { name: 'Reuniones', headers: ['id', 'fecha', 'tipo', 'asignaciones'] },
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
    if (sheetName === 'Personas') localStorage.removeItem(STORAGE_KEY_PERSONAS);
    if (sheetName === 'Reuniones') localStorage.removeItem(STORAGE_KEY_REUNIONES);
  },

  getPersonas: async () => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}?action=getData&sheet=Personas&ssId=${spreadsheetId || ''}`, {
          method: 'GET',
          redirect: 'follow'
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
      } catch (e) {
        console.error('Error fetching personas:', e);
      }
    }
    const data = localStorage.getItem(STORAGE_KEY_PERSONAS);
    return data ? JSON.parse(data) : [];
  },

  savePersona: async (persona) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'saveData',
            sheet: 'Personas',
            payload: persona,
            ssId: spreadsheetId
          })
        });
      } catch (e) {
        console.error('Error saving persona:', e);
      }
    }
    const personas = await dataService.getPersonas();
    const index = personas.findIndex(p => p.id == persona.id);
    if (index >= 0) personas[index] = persona; else personas.push(persona);
    localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas));
    return personas;
  },

  getReuniones: async () => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        const response = await fetch(`${apiUrl}?action=getData&sheet=Reuniones&ssId=${spreadsheetId || ''}`, {
          method: 'GET',
          redirect: 'follow'
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        return data;
      } catch (e) {
        console.error('Error fetching reuniones:', e);
      }
    }
    const data = localStorage.getItem(STORAGE_KEY_REUNIONES);
    return data ? JSON.parse(data) : [];
  },

  saveReunion: async (reunion) => {
    const { apiUrl, spreadsheetId } = dataService.getConfig();
    if (apiUrl) {
      try {
        await fetch(apiUrl, {
          method: 'POST',
          mode: 'no-cors',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'saveData',
            sheet: 'Reuniones',
            payload: reunion,
            ssId: spreadsheetId
          })
        });
      } catch (e) {
        console.error('Error saving reunion:', e);
      }
    }
    const reuniones = await dataService.getReuniones();
    const index = reuniones.findIndex(r => r.id == reunion.id);
    if (index >= 0) reuniones[index] = reunion; else reuniones.push(reunion);
    localStorage.setItem(STORAGE_KEY_REUNIONES, JSON.stringify(reuniones));
    return reuniones;
  },

  queryData: async (sheetName, expression) => {
    let data;
    if (sheetName === 'Personas') data = await dataService.getPersonas();
    else if (sheetName === 'Reuniones') data = await dataService.getReuniones();
    else return null;

    try {
      const expr = jsonata(expression);
      return await expr.evaluate(data);
    } catch (e) {
      console.error('JSONata evaluation error:', e);
      return data;
    }
  }
};
