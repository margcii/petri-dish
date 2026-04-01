import client from './client'

export interface Dish {
  dish_id: number
  user_id: number
  name: string
  created_at: string
  fungus_count?: number
}

export interface DishWithFungi {
  dish_id: number
  user_id: number
  name: string
  created_at: string
  fungi: Fungus[]
}

export interface Fungus {
  fungus_id: number
  text: string
  image_id: string
  status: 'idle' | 'incubating' | 'in_air'
  location: string
  unlock_time: number | null
  created_at: string
}

export const createDish = async (userId: number, name: string): Promise<Dish> => {
  const res = await client.post('/create_dish', { user_id: userId, name })
  return res.data
}

export const getUserDishes = async (userId: number): Promise<Dish[]> => {
  const res = await client.get(`/user_dishes/${userId}`)
  return res.data.dishes
}

export const getDish = async (dishId: number): Promise<DishWithFungi> => {
  const res = await client.get(`/get_dish/${dishId}`)
  return res.data
}
