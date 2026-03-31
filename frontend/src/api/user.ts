import client from './client'

export interface User {
  user_id: number
  name: string
  created_at: string
}

export const registerUser = async (name: string): Promise<User> => {
  const res = await client.post('/register', { name })
  return res.data
}
