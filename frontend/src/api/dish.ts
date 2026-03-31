import client from './client'

export interface Dish {
  dish_id: number
  user_id: number
  name: string
  created_at: string
}

export interface DishDetail {
  dish_id: number
  name: string
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

export const getDish = async (dishId: number): Promise<DishDetail> => {
  const res = await client.get(`/get_dish/${dishId}`)
  return res.data
}
