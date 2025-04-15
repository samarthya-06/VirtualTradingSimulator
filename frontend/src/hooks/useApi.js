import { useState, useCallback } from 'react';
import api from '../utils/axiosConfig';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api(config);
      return response.data;
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Something went wrong'
      );
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback(
    (url, config = {}) => request({ ...config, method: 'GET', url }),
    [request]
  );

  const post = useCallback(
    (url, data, config = {}) =>
      request({ ...config, method: 'POST', url, data }),
    [request]
  );

  const put = useCallback(
    (url, data, config = {}) => request({ ...config, method: 'PUT', url, data }),
    [request]
  );

  const del = useCallback(
    (url, config = {}) => request({ ...config, method: 'DELETE', url }),
    [request]
  );

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    del,
  };
};

export default useApi; 