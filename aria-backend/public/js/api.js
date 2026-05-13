// ════════════════════════════════════════════════════════════
// ARIA MUSIC SCHOOL — Frontend API Client
// Include this in dashboard.html and website.html
// ════════════════════════════════════════════════════════════

(function () {
  const API_BASE = window.ARIA_API_BASE || '/api';
  const TOKEN_KEY = 'aria_token';

  // ─── Token management ───
  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }
  function setToken(t) {
    try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {}
  }
  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  // ─── Core request helper ───
  async function request(method, path, body, isFormData) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body !== undefined) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(API_BASE + path, opts);
    let data = null;
    try { data = await res.json(); } catch (e) {}

    if (!res.ok) {
      const err = new Error(data?.error || `Request failed: ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ─── Public API ───
  window.AriaAPI = {
    // Auth
    login: (email, password) =>
      request('POST', '/auth/login', { email, password }).then(r => { setToken(r.token); return r; }),
    logout: () => clearToken(),
    me: () => request('GET', '/auth/me'),
    isAuthed: () => !!getToken(),

    // Teachers
    teachers: {
      list: () => request('GET', '/teachers'),
      get: (id) => request('GET', `/teachers/${id}`),
      create: (data) => request('POST', '/teachers', data),
      update: (id, data) => request('PUT', `/teachers/${id}`, data),
      delete: (id) => request('DELETE', `/teachers/${id}`),
    },

    // Students
    students: {
      list: (params) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('GET', '/students' + qs);
      },
      get: (id) => request('GET', `/students/${id}`),
      create: (data) => request('POST', '/students', data),
      update: (id, data) => request('PUT', `/students/${id}`, data),
      delete: (id) => request('DELETE', `/students/${id}`),
    },

    // Classes
    classes: {
      list: (params) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('GET', '/classes' + qs);
      },
      create: (data) => request('POST', '/classes', data),
      update: (id, data) => request('PUT', `/classes/${id}`, data),
      delete: (id) => request('DELETE', `/classes/${id}`),
    },

    // Concerts
    concerts: {
      list: (params) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('GET', '/concerts' + qs);
      },
      upcoming: () => request('GET', '/concerts?upcoming=true'),
      get: (id) => request('GET', `/concerts/${id}`),
      create: (data) => request('POST', '/concerts', data),
      update: (id, data) => request('PUT', `/concerts/${id}`, data),
      delete: (id) => request('DELETE', `/concerts/${id}`),

      // Participants
      addParticipant: (concertId, data) => request('POST', `/concerts/${concertId}/participants`, data),
      updateParticipant: (concertId, participantId, data) =>
        request('PUT', `/concerts/${concertId}/participants/${participantId}`, data),
      removeParticipant: (concertId, participantId) =>
        request('DELETE', `/concerts/${concertId}/participants/${participantId}`),
    },

    // Media (gallery)
    media: {
      list: (params) => {
        const qs = params ? '?' + new URLSearchParams(params).toString() : '';
        return request('GET', '/media' + qs);
      },
      // Upload file (FormData)
      upload: (file, metadata) => {
        const fd = new FormData();
        fd.append('file', file);
        if (metadata) {
          for (const [k, v] of Object.entries(metadata)) {
            fd.append(k, v);
          }
        }
        return request('POST', '/media/upload', fd, true);
      },
      // External URL (YouTube/Vimeo)
      create: (data) => request('POST', '/media', data),
      update: (id, data) => request('PUT', `/media/${id}`, data),
      delete: (id) => request('DELETE', `/media/${id}`),
    },
  };

  console.log('AriaAPI ready. Base:', API_BASE);
})();
