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

export const getStoredUser = (): User | null => {
  const userData = localStorage.getItem('petri_user')
  if (userData) {
    try {
      return JSON.parse(userData) as User
    } catch {
      return null
    }
  }
  return null
}

export const storeUser = (user: User): void => {
  localStorage.setItem('petri_user', JSON.stringify(user))
}

export const clearUser = (): void => {
  localStorage.removeItem('petri_user')
}
