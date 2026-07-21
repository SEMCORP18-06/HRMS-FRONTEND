const BASE_URL = 'https://hrms-backend-gamma.vercel.app/api';

export async function request(endpoint, options = {}) {
  const token = localStorage.getItem('hr_token');
  const headers = {
    ...options.headers,
  };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = {
    ...options,
    headers,
  };
  
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(errData.detail || 'Request failed');
  }
  
  return response.json();
}

export const api = {
  auth: {
    login: (email, password, role) => request('/auth/login', {
      method: 'POST',
      body: { email, password, role }
    }),
    signup: (signupData) => request('/auth/signup', {
      method: 'POST',
      body: signupData
    }),
    signupStatus: () => request('/auth/signup-status'),
    tenants: () => request('/auth/tenants'),
    me: () => request('/auth/me')
  },
  attendance: {
    getToday: () => request('/attendance/today'),
    mark: (selection) => request('/attendance/mark', {
      method: 'POST',
      body: { selection }
    }),
    getMyMonth: (year, month) => request(`/attendance/my-month?year=${year}&month=${month}`),
    getAdminMonth: (year, month) => request(`/attendance/admin/month?year=${year}&month=${month}`),
    permitLateAttendance: (employeeId) => request('/attendance/permit/' + employeeId, { method: 'POST' }),
    permitLateAttendanceAll: () => request('/attendance/permit-all', { method: 'POST' }),
    saveLeaveAllocation: (data) => request('/attendance/leave-allocation', { method: 'POST', body: data }),
    getLeaveAllocations: (year, month, employeeId) => {
      let url = `/attendance/leave-allocation?year=${year}&month=${month}`;
      if (employeeId) url += `&employee_id=${employeeId}`;
      return request(url);
    },
    getLeaveSummary: (year, month, employeeId) => {
      let url = `/attendance/leave-summary?year=${year}&month=${month}`;
      if (employeeId) url += `&employee_id=${employeeId}`;
      return request(url);
    },
    lockMonth: (year, month) => request('/attendance/lock', { method: 'POST', body: { year, month } }),
    unlockMonth: (year, month) => request('/attendance/unlock', { method: 'POST', body: { year, month } }),
    getLockStatus: (year, month) => request(`/attendance/lock-status?year=${year}&month=${month}`)
  },
  employees: {
    list: (activeOnly = false) => request(`/employees?active_only=${activeOnly}`),
    create: (emp) => request('/employees', {
      method: 'POST',
      body: emp
    }),
    import: (formData) => fetch(`${BASE_URL}/employees/import`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('hr_token')}`
      }
    }).then(res => {
      if (!res.ok) throw new Error('File import failed');
      return res.json();
    }),
    archive: (id) => request(`/employees/${id}/archive`, {
      method: 'PUT'
    }),
    restore: (id) => request(`/employees/${id}/restore`, {
      method: 'PUT'
    }),
    delete: (id) => request(`/employees/${id}`, {
      method: 'DELETE'
    }),
    update: (id, emp) => request(`/employees/${id}`, {
      method: 'PUT',
      body: emp
    })
  },
  celebrations: {
    match: () => request('/celebrations/match'),
    send: (employeeId, type) => request('/celebrations/send', {
      method: 'POST',
      body: { employee_id: employeeId, type }
    }),
    listAll: () => request('/celebrations/all')
  },
  payroll: {
    upload: (formData) => fetch(`${BASE_URL}/payroll/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('hr_token')}`
      }
    }).then(res => {
      if (!res.ok) throw new Error('CSV upload failed');
      return res.json();
    }),
    list: () => request('/payroll'),
    email: (payrollId) => request(`/payroll/${payrollId}/email`, { method: 'POST' })
  },
  dailyPulse: {
    quotes: () => request('/daily-pulse/quotes'),
    createQuote: (text, author) => request('/daily-pulse/quotes', {
      method: 'POST',
      body: { text, author }
    }),
    trigger: () => request('/daily-pulse/trigger', { method: 'POST' }),
    schedule: () => request('/daily-pulse/schedule'),
    today: () => request('/daily-pulse/today')
  },
  surpriseOps: {
    coupons: () => request('/surprise-ops/coupons'),
    createCoupon: (coupon) => request('/surprise-ops/coupons', {
      method: 'POST',
      body: coupon
    }),
    send: (couponId, email) => request(`/surprise-ops/coupons/${couponId}/send`, {
      method: 'POST',
      body: { email }
    }),
    archiveCoupon: (couponId) => request(`/surprise-ops/coupons/${couponId}/archive`, {
      method: 'PUT'
    }),
    deleteCoupon: (couponId) => request(`/surprise-ops/coupons/${couponId}`, {
      method: 'DELETE'
    }),
    appreciations: () => request('/surprise-ops/appreciation'),
    createAppreciation: (formData) => request('/surprise-ops/appreciation', {
      method: 'POST',
      body: formData
    }),
    sendAppreciation: (appreciationId) => request(`/surprise-ops/appreciation/${appreciationId}/send`, {
      method: 'POST'
    }),
    deleteAppreciation: (appreciationId) => request(`/surprise-ops/appreciation/${appreciationId}`, {
      method: 'DELETE'
    })
  },
  lmsClub: {
    clubs: () => request('/lms-club/clubs'),
    createClub: (club) => request('/lms-club/clubs', {
      method: 'POST',
      body: club
    }),
    deleteClub: (clubId) => request(`/lms-club/clubs/${clubId}`, { method: 'DELETE' }),
    updateMembers: (clubId, employeeIds) => request(`/lms-club/clubs/${clubId}/members`, {
      method: 'POST',
      body: { employee_ids: employeeIds }
    })
  },
  events: {
    list: () => request('/events'),
    create: (event) => request('/events', {
      method: 'POST',
      body: event
    }),
    archive: (id) => request(`/events/${id}/archive`, {
      method: 'PUT'
    }),
    delete: (id) => request(`/events/${id}`, {
      method: 'DELETE'
    })
  },
  assets: {
    list: () => request('/assets'),
    create: (asset) => request('/assets', {
      method: 'POST',
      body: asset
    }),
    checkout: (assetId, employeeId, durationDays, quantity) => request(`/assets/${assetId}/checkout`, {
      method: 'POST',
      body: { employee_id: employeeId, duration_days: durationDays, quantity }
    }),
    checkin: (assetId, checkoutId) => request(`/assets/${assetId}/checkin`, { 
      method: 'POST',
      body: { checkout_id: checkoutId }
    })
  },
  documents: {
    list: () => request('/documents/requests'),
    request: (docType, employeeId) => request('/documents/requests', {
      method: 'POST',
      body: { document_type: docType, employee_id: employeeId }
    }),
    getVault: (employeeId) => request('/documents/vault/' + employeeId),
    savePersonal: (formData) => request('/documents/personal', {
      method: 'POST',
      body: formData
    }),
    saveCompany: (employeeId, formData) => request('/documents/company/' + employeeId, {
      method: 'POST',
      body: formData
    })
  },
  offboarding: {
    getMyStatus: () => request('/offboarding/status'),
    trigger: (employeeId) => request(`/offboarding/trigger/${employeeId}`, { method: 'POST' }),
    submitNotice: (employeeId, data) => request(`/offboarding/notice/${employeeId}`, {
      method: 'POST',
      body: data
    }),
    scheduleInterview: (employeeId, data) => request(`/offboarding/schedule-interview/${employeeId}`, {
      method: 'POST',
      body: data
    }),
    markChecklistComplete: (employeeId) => request(`/offboarding/mark-checklist/${employeeId}`, { method: 'POST' }),
    deleteEmployee: (employeeId) => request(`/offboarding/delete/${employeeId}`, { method: 'POST' })
  },
  surveys: {
    metrics: () => request('/surveys/metrics'),
    submit: (survey) => request('/surveys/submit', {
      method: 'POST',
      body: survey
    })
  },
  policies: {
    list: () => request('/policies'),
    create: (policy) => request('/policies', {
      method: 'POST',
      body: policy
    }),
    search: (query) => request(`/policies/search?q=${encodeURIComponent(query)}`)
  },
  interviews: {
    list: () => request('/interviews'),
    create: (interview) => request('/interviews', {
      method: 'POST',
      body: interview
    })
  },
  holidays: {
    list: (year) => request(year ? `/holidays?year=${year}` : '/holidays'),
    create: (data) => request('/holidays', {
      method: 'POST',
      body: data
    }),
    update: (id, data) => request(`/holidays/${id}`, {
      method: 'PUT',
      body: data
    }),
    delete: (id) => request(`/holidays/${id}`, {
      method: 'DELETE'
    })
  },
  elibrary: {
    list: () => request('/elibrary'),
    upload: (formData) => fetch(`${BASE_URL}/elibrary`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('hr_token')}`
      }
    }).then(res => {
      if (!res.ok) return res.json().then(e => { throw new Error(e.detail || 'Upload failed'); });
      return res.json();
    }),
    delete: (fileId) => request(`/elibrary/${fileId}`, { method: 'DELETE' }),
    fileUrl: (filename) => {
      const token = localStorage.getItem('hr_token');
      return `/api/static/uploads/elibrary/${filename}?token=${encodeURIComponent(token || '')}`;
    },
    listLinks: () => request('/elibrary/links'),
    createLink: (link) => request('/elibrary/links', {
      method: 'POST',
      body: link
    }),
    deleteLink: (linkId) => request(`/elibrary/links/${linkId}`, { method: 'DELETE' })
  },
  discussions: {
    list: () => request('/discussions'),
    create: (data) => request('/discussions', {
      method: 'POST',
      body: data
    }),
    postMessage: (threadId, text) => request(`/discussions/${threadId}/messages`, {
      method: 'POST',
      body: { text }
    }),
    delete: (threadId) => request(`/discussions/${threadId}`, { method: 'DELETE' })
  }
};
