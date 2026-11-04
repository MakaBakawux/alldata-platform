import axios from 'axios'
import { getToken } from '@/utils/auth'

const client = axios.create({
  baseURL: process.env.VUE_APP_OCR_API,
  timeout: 120000
})

client.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers.Authorization = token
  return config
})

export function recognize(formData) {
  return client.post('/api/ocr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function submitFeedback(formData) {
  return client.post('/api/feedback', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
