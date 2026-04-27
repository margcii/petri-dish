import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.PROD ? '' : (import.meta.env.VITE_API_BASE ?? '/api'),
  timeout: 10000,
})

export default client
