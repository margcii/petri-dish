export interface User {
  user_id: number
  name: string
  created_at: string
}

export interface Dish {
  dish_id: number
  user_id: number
  name: string
  created_at: string
}

export interface Fungus {
  fungus_id: number
  text: string
  image_id: string
  status: 'idle' | 'incubating' | 'in_air'
  location: string
  unlock_time: number | null
  creator_id: number
  parent_ids: number[] | null
  created_at: string
}
