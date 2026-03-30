const getApiBase = () => {
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:5001';
  }
  if (window.location.hostname === 'sqlinj.local') {
    return 'http://sqlinj.local';
  }
  return `https://${window.location.hostname.replace('-3000.', '-5001.')}`;
};

const API_BASE = getApiBase();

const config = {
  GRAPHQL_ENDPOINT:     `${API_BASE}/graphql-secure`,
  GRAPHQL_ENDPOINT_INS: `${API_BASE}/graphql-insecure`,
  REST_API_BASE_URL:    `${API_BASE}/api/safe-users`,
  REMOVE_CLOTH_URL:     `${API_BASE}/api/safe-users/remove-cloth`,
  REST_API_BASE_URL_INS:`${API_BASE}/api/insecure-users`,
};

export default config;
