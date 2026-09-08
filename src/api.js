const API_BASE_URL = 'http://192.168.0.5:5000';

const request = async (path, method = 'GET', body = null, token = null) => {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
};

// =====================
// Auth
// =====================
export const registerCustomer = (payload) =>
  request('/api/customer/auth/register', 'POST', payload);

export const loginCustomer = (payload) =>
  request('/api/customer/auth/login', 'POST', payload);

export const getCustomerProfile = (token) =>
  request('/api/customer/auth/profile', 'GET', null, token);

export const updateCustomerProfile = (payload, token) =>
  request('/api/customer/auth/profile', 'PUT', payload, token);

// =====================
// App Config (per-hour rate etc.)
// =====================
export const getAppConfig = () =>
  request('/api/config', 'GET');

// =====================
// Customer Vehicles
// =====================
export const getCustomerVehicles = (token) =>
  request('/api/customer/vehicles', 'GET', null, token);

export const addCustomerVehicle = (payload, token) =>
  request('/api/customer/vehicles', 'POST', payload, token);

export const updateCustomerVehicleModel = (id, payload, token) =>
  request(`/api/customer/vehicles/${id}/model`, 'PUT', payload, token);

// =====================
// Drivers
// =====================
export const getNearbyDrivers = (latitude, longitude) =>
  request(`/api/customer/drivers/nearby?latitude=${latitude}&longitude=${longitude}`);

// =====================
// Bookings
// =====================
export const createBooking = (payload, token) =>
  request('/api/customer/bookings', 'POST', payload, token);

export const getBookings = (token) =>
  request('/api/customer/bookings', 'GET', null, token);

export const getBookingById = (id, token) =>
  request(`/api/customer/bookings/${id}`, 'GET', null, token);

export const getBookingStatus = (id, token) =>
  request(`/api/customer/bookings/${id}/status`, 'GET', null, token);

export const cancelBooking = (id, token) =>
  request(`/api/customer/bookings/${id}/cancel`, 'PUT', {}, token);

// =====================
// Driver Requests (sent to drivers)
// =====================
export const createDriverRequest = (payload, token) =>
  request('/api/customer/driver-requests', 'POST', payload, token);

export const getDriverRequests = (token) =>
  request('/api/customer/driver-requests', 'GET', null, token);

export const getDriverRequestById = (id, token) =>
  request(`/api/customer/driver-requests/${id}`, 'GET', null, token);

export const cancelDriverRequest = (id, token) =>
  request(`/api/customer/driver-requests/${id}/cancel`, 'PUT', {}, token);

// =====================
// Acting Driver Bookings (first-accept-wins flow)
// =====================
export const getActionAvailableDrivers = (params, token) => {
  const qs = Object.keys(params || {})
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
  return request(`/api/action/customers/available-drivers?${qs}`, 'GET', null, token);
};

export const createActionBooking = (payload, token) =>
  request('/api/action/customers/bookings', 'POST', payload, token);

export const getActionBookingById = (id, token) =>
  request(`/api/action/customers/bookings/${id}`, 'GET', null, token);

export const getActionBookings = (status, token) =>
  request(
    `/api/action/customers/bookings${status ? `?status=${encodeURIComponent(status)}` : ''}`,
    'GET',
    null,
    token
  );

export const getActionUpcomingBookings = (token) =>
  request('/api/action/customers/bookings/upcoming', 'GET', null, token);

export const cancelActionBooking = (id, reason, token) =>
  request(`/api/action/customers/bookings/${id}/cancel`, 'POST', { reason }, token);

export default request;