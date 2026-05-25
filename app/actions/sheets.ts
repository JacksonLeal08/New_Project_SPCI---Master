'use server';

export async function createSpreadsheet(accessToken: string, title: string): Promise<{ id: string; url: string }> {
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: title
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Erro ao inicializar Planilha no Google Sheets.');
    }

    const data = await res.json();
    return {
      id: data.spreadsheetId,
      url: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`
    };
  } catch (error: any) {
    console.error('createSpreadsheet error:', error);
    throw error;
  }
}

export async function getFirstSheetName(accessToken: string, spreadsheetId: string): Promise<string> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.sheets && data.sheets.length > 0) {
        return data.sheets[0].properties.title || 'Sheet1';
      }
    }
  } catch (err) {
    console.error('getFirstSheetName error:', err);
  }
  return 'Sheet1';
}

export async function readSpreadsheet(accessToken: string, spreadsheetId: string, range = 'Sheet1!A1:Z500'): Promise<any[][] | null> {
  try {
    if (range.includes('Sheet1')) {
      const actualFirstSheet = await getFirstSheetName(accessToken, spreadsheetId);
      range = range.replace('Sheet1', actualFirstSheet);
    }
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Erro ao ler dados do Google Sheets.');
    }

    const data = await res.json();
    return data.values || null;
  } catch (error) {
    console.error('readSpreadsheet error:', error);
    throw error;
  }
}

export async function writeSpreadsheet(accessToken: string, spreadsheetId: string, values: any[][], range = 'Sheet1!A1'): Promise<void> {
  try {
    const actualFirstSheet = await getFirstSheetName(accessToken, spreadsheetId);
    let clearRange = 'Sheet1!A1:Z500';
    if (clearRange.includes('Sheet1')) {
      clearRange = clearRange.replace('Sheet1', actualFirstSheet);
    }
    if (range.includes('Sheet1')) {
      range = range.replace('Sheet1', actualFirstSheet);
    }

    // Clear the active grid first to ensure clean state
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: "ROWS",
        values
      })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error?.message || 'Erro ao gravar dados na tabela.');
    }
  } catch (error) {
    console.error('writeSpreadsheet error:', error);
    throw error;
  }
}
