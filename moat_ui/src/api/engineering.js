import axios from 'axios'
import { getToken } from '@/utils/auth'

const client = axios.create({
  baseURL: process.env.VUE_APP_DATA_API,
  timeout: 120000
})

client.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = token
  return config
})

export function cleanData(data) {
  return client.post('/api/clean', data)
}

export function previewImport(data) {
  return client.post('/api/preview', data)
}

export function confirmImport(data) {
  return client.post('/api/import/confirm', data)
}

export function queryData(data) {
  return client.post('/api/query', data)
}

export function getStatistics(params) {
  return client.get('/api/statistics/overview', { params })
}

export function textToSql(data) {
  return client.post('/api/text-to-sql', data)
}
