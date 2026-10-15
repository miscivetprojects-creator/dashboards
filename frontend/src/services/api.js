const API_BASE = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

function getStoredAuthToken() {
  return localStorage.getItem('civet_auth_token') || '';
}

export function setAuthToken(token, user) {
  if (token) {
    localStorage.setItem('civet_auth_token', token);
    localStorage.setItem('civet_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('civet_auth_token');
    localStorage.removeItem('civet_user');
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('civet_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function executeApiRequest(endpoint, options = {}) {
  const token = getStoredAuthToken();
  const headers = {
    ...(options.headers || {})
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (res.status === 401) {
    setAuthToken(null, null);
    if (!window.location.hash.includes('login')) {
      window.dispatchEvent(new CustomEvent('civet_unauthorized'));
    }
    throw new Error('Authentication required or session expired.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('spreadsheetml') || contentType.includes('octet-stream')) {
    if (!res.ok) {
      throw new Error('Download failed.');
    }
    return await res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

export const api = {
  async login(email, password) {
    const data = await executeApiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setAuthToken(data.token, data.user);
    return data;
  },

  async logout() {
    try {
      await executeApiRequest('/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null, null);
    }
  },

  async getMe() {
    return await executeApiRequest('/auth/me');
  },

  async getMainDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/main?${q}`);
  },

  async getPMDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/pm?${q}`);
  },

  async getStoresDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/stores?${q}`);
  },

  async getFuelDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/fuel?${q}`);
  },

  async getMMSDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/mms?${q}`);
  },

  async getAccountsDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/accounts?${q}`);
  },

  async getAdminDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/admin?${q}`);
  },

  async getPlanningDashboard(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/planning?${q}`);
  },

  async getDepartmentDashboard(deptCode, filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/department/${encodeURIComponent(deptCode)}?${q}`);
  },

  async getLocationDashboard(locationName, filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/dashboard/location/${encodeURIComponent(locationName)}?${q}`);
  },

  async exportDashboardPdf(payload) {
    return await executeApiRequest('/dashboard/export-pdf', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSchemas() {
    return await executeApiRequest('/workspace/schemas');
  },

  async downloadTemplate(reportType) {
    return await executeApiRequest(`/workspace/template/${reportType}`);
  },

  async previewImport(formData) {
    return await executeApiRequest('/workspace/import/preview', {
      method: 'POST',
      body: formData
    });
  },

  async confirmImport(batchId) {
    return await executeApiRequest('/workspace/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ batchId })
    });
  },

  async downloadErrorReport(batchId) {
    return await executeApiRequest(`/workspace/import/error-report/${batchId}`);
  },

  async submitManualEntry(reportType, data) {
    return await executeApiRequest('/workspace/manual-entry', {
      method: 'POST',
      body: JSON.stringify({ reportType, data })
    });
  },

  async getPreviousBalance(location, date, ledgerType) {
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (date) params.append('date', date);
    if (ledgerType) params.append('ledger_type', ledgerType);
    return await executeApiRequest(`/workspace/previous-balance?${params.toString()}`);
  },

  async getRecentWorkspaceEntries() {
    return await executeApiRequest('/workspace/recent');
  },

  async getRegisterRecords(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/register/records?${q}`);
  },

  async getRecordDetail(id) {
    return await executeApiRequest(`/register/record/${id}`);
  },

  async reviseRecord(id, updatedData, changeReason) {
    return await executeApiRequest(`/register/record/${id}/revise`, {
      method: 'POST',
      body: JSON.stringify({ updatedData, changeReason })
    });
  },

  async exportRegisterExcel(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/register/export/excel?${q}`);
  },

  async exportRegisterPdf(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return await executeApiRequest(`/register/export/pdf?${q}`);
  },

  async exportMasterExcel(collection) {
    return await executeApiRequest(`/master/${collection}/export/excel`);
  },

  async exportMasterPdf(collection) {
    return await executeApiRequest(`/master/${collection}/export/pdf`);
  },

  async getMasterTemplate(collection) {
    return await executeApiRequest(`/master/${collection}/template`);
  },

  async bulkImportMaster(collection, fileOrItems) {
    if (fileOrItems instanceof FormData) {
      return await executeApiRequest(`/master/${collection}/bulk-import`, {
        method: 'POST',
        body: fileOrItems
      });
    } else if (fileOrItems instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrItems);
      return await executeApiRequest(`/master/${collection}/bulk-import`, {
        method: 'POST',
        body: formData
      });
    } else {
      return await executeApiRequest(`/master/${collection}/bulk-import`, {
        method: 'POST',
        body: JSON.stringify({ items: fileOrItems })
      });
    }
  },

  async exportUsersExcel() {
    return await executeApiRequest('/master/users/export/excel');
  },

  async exportUsersPdf() {
    return await executeApiRequest('/master/users/export/pdf');
  },

  async getUsersTemplate() {
    return await executeApiRequest('/master/users/template');
  },

  async bulkImportUsers(fileOrItems) {
    if (fileOrItems instanceof FormData) {
      return await executeApiRequest('/master/users/bulk-import', {
        method: 'POST',
        body: fileOrItems
      });
    } else if (fileOrItems instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrItems);
      return await executeApiRequest('/master/users/bulk-import', {
        method: 'POST',
        body: formData
      });
    } else {
      return await executeApiRequest('/master/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ items: fileOrItems })
      });
    }
  },

  async getMaster(collection) {
    return await executeApiRequest(`/master/${collection}`);
  },

  async getMasterNextCode(collection) {
    return await executeApiRequest(`/master/${collection}/next-code`);
  },

  async createMaster(collection, data) {
    return await executeApiRequest(`/master/${collection}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateMaster(collection, id, data) {
    return await executeApiRequest(`/master/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteMaster(collection, id) {
    return await executeApiRequest(`/master/${collection}/${id}`, {
      method: 'DELETE'
    });
  },

  async getUsers() {
    return await executeApiRequest('/master/users');
  },

  async createUser(data) {
    return await executeApiRequest('/master/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async setUserStatus(id, isActive) {
    return await executeApiRequest(`/master/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive })
    });
  },

  async resetUserPassword(id, newPassword) {
    return await executeApiRequest(`/master/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword })
    });
  },

  async checkUpdates(currentVersion) {
    return await executeApiRequest(`/updates/check?version=${encodeURIComponent(currentVersion || '1.0.0')}`);
  },

  async getLatestUpdate() {
    return await executeApiRequest('/updates/latest');
  },

  async checkInDevice(deviceData) {
    return await executeApiRequest('/updates/check-in', {
      method: 'POST',
      body: JSON.stringify(deviceData)
    });
  },

  async getRegisteredDevices() {
    return await executeApiRequest('/updates/devices');
  },

  async publishUpdate(updateData) {
    return await executeApiRequest('/updates/publish', {
      method: 'POST',
      body: JSON.stringify(updateData)
    });
  }
};
