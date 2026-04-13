import client from './client'

export interface Dish {
  dish_id: string
  user_id: string
  name: string
  created_at: string
  fungus_count?: number
}

export interface DishWithFungi {
  dish_id: string
  user_id: string
  name: string
  created_at: string
  fungi: Fungus[]
}

export interface Fungus {
  fungus_id: string
  dish_id: string | null
  user_id: string
  content: string
  image_id: string
  status: 'idle' | 'incubating' | 'in_air'
  location: string
  is_parent?: boolean  // 是否已作为亲本参与杂交（杂交后不显示）
  unlock_time: string | null
  parent1_id: string | null
  parent2_id: string | null
  parent1_image_id?: string | null  // 父母真菌的颜色样式ID
  parent2_image_id?: string | null  // 父母真菌的颜色样式ID
  created_at: string
}

export const createDish = async (userId: string, name: string): Promise<Dish> => {
  const res = await client.post('/create_dish', { user_id: userId, name })
  return res.data
}

export const getUserDishes = async (userId: string): Promise<Dish[]> => {
  const res = await client.get(`/user_dishes/${userId}`)
  return res.data.dishes
}

export const getDish = async (dishId: string): Promise<DishWithFungi> => {
  const res = await client.get(`/get_dish/${dishId}`)
  // 后端返回 {dish, fungi}，转换为前端期望的扁平结构
  return {
    ...res.data.dish,
    fungi: res.data.fungi
  }
}
