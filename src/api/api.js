import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const signup = async (user) => axios.post(`${API_BASE_URL}/signup`, user);
export const login = async (user) => axios.post(`${API_BASE_URL}/login`, user);
export const uploadFile = async (formData) => {
  return axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};


export const addAnnotation = async (annotation) => {
  return axios.post(`${API_BASE_URL}/add-annotation`, annotation);
};

export const fetchUserData = async (username, datatype) => {
  return axios.get(`${API_BASE_URL}/data/${username}/${datatype}`);
};
