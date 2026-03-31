import client from './client'

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

export const uploadFungus = async (
  text: string,
  userId: number,
  location: 'air' | number
): Promise<Fungus> => {
  const res = await client.post('/upload', { text, user_id: userId, location })
  return res.data
}

export const triggerHybrid = async (dishId: number): Promise<{ message: string }> => {
  const res = await client.post('/trigger_hybrid', { dish_id: dishId })
  return res.data
}

export const breathe = async (): Promise<{ message: string; new_fungi: Fungus[] }> => {
  const res = await client.post('/breathe')
  return res.data
}
