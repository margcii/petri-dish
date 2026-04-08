import client from './client'

export interface Fungus {
  fungus_id: string
  dish_id: string | null
  user_id: string
  content: string
  image_id: string
  status: 'idle' | 'incubating' | 'in_air'
  location: string
  is_parent?: boolean  // 是否已作为亲本参与杂交
  unlock_time: string | null
  parent1_id: string | null
  parent2_id: string | null
  created_at: string
}

export interface UploadFungusParams {
  user_id: string
  content: string
  dish_id?: string
  image_id?: string
}

/**
 * 上传文本创建真菌
 * @param params - 上传参数
 * @returns 创建的真菌对象
 */
export const uploadFungus = async (params: UploadFungusParams): Promise<Fungus> => {
  const res = await client.post('/upload', params)
  return res.data
}

/**
 * 将真菌发射到空气中
 * @param userId - 用户ID
 * @param content - 文本内容
 * @returns 创建的真菌对象
 */
export const launchToAir = async (userId: string, content: string): Promise<Fungus> => {
  const res = await client.post('/upload', { user_id: userId, content })
  return res.data
}

/**
 * 将空气中的真菌吸入培养皿
 * @param dishId - 培养皿ID
 * @returns 操作结果消息
 */
export const breatheFungus = async (dishId: string): Promise<{ message: string; data?: { fungus_id: string } }> => {
  const res = await client.post('/breathe', { dish_id: dishId })
  return res.data
}

/**
 * 触发两个真菌杂交
 * @param fungus1Id - 第一个真菌ID
 * @param fungus2Id - 第二个真菌ID
 * @returns 杂交产生的新真菌
 */
export const triggerHybrid = async (fungus1Id: string, fungus2Id: string): Promise<Fungus> => {
  const res = await client.post('/trigger_hybrid', { fungus1_id: fungus1Id, fungus2_id: fungus2Id })
  return res.data
}

/**
 * 检查杂交状态
 * @param fungusId - 真菌ID
 * @returns 真菌对象（包含最新状态）
 */
export const checkHybridStatus = async (fungusId: string): Promise<Fungus> => {
  const res = await client.get(`/check_hybrid/${fungusId}`)
  return res.data
}

/**
 * 获取空气中的真菌列表
 * @returns 空气中的真菌数组
 */
export const getAirFungi = async (): Promise<Fungus[]> => {
  const res = await client.get('/air')
  return res.data.fungi
}

/**
 * 发送心跳（在线状态检测）
 * @param user_id - 用户ID
 * @returns 操作结果
 */
export const sendHeartbeat = async (user_id: string): Promise<{ message: string }> => {
  const res = await client.post('/heartbeat', null, { params: { user_id } })
  return res.data
}

/**
 * 检查新杂交真菌
 * @param dish_id - 培养皿ID
 * @param after - 可选，时间戳，查询此时间之后的新杂交
 * @returns 新杂交真菌列表和最新时间戳
 */
export interface CheckNewHybridResponse {
  new_hybrids: Fungus[]
  latest_timestamp: string | null
}

export const checkNewHybrid = async (dish_id: string, after?: string): Promise<CheckNewHybridResponse> => {
  const params = after ? { after } : {}
  const res = await client.get(`/check_new_hybrid/${dish_id}`, { params })
  return res.data
}

/**
 * 分配空气真菌到培养皿（支持fallback到库中其他培养皿）
 * @param dish_id - 目标培养皿ID
 * @param user_id - 用户ID（当目标培养皿满时用于fallback）
 * @returns 操作结果消息
 */
export interface DistributeAirResponse {
  message: string
  data?: {
    fungus_id: string
    dish_id: string
    dish_name?: string
    fallback?: boolean
  }
}

export const distributeAir = async (dish_id: string, user_id: string): Promise<DistributeAirResponse> => {
  const res = await client.post('/distribute_air', null, {
    params: { dish_id, user_id }
  })
  return res.data
}
