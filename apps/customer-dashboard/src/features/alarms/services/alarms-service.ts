import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type { AlarmDTO, CreateAlarmInput, UpdateAlarmInput } from '../types';

export const alarmsService = {
  async list(signal?: AbortSignal): Promise<AlarmDTO[]> {
    const res = await apiClient.get<{ alarms: AlarmDTO[] }>(ENDPOINTS.ALARMS.LIST, { signal });
    return res.data.alarms;
  },

  async get(id: string, signal?: AbortSignal): Promise<AlarmDTO> {
    const res = await apiClient.get<AlarmDTO>(ENDPOINTS.ALARMS.GET(id), { signal });
    return res.data;
  },

  async create(input: CreateAlarmInput): Promise<AlarmDTO> {
    const res = await apiClient.post<{ alarm: AlarmDTO }>(ENDPOINTS.ALARMS.CREATE, input);
    return res.data.alarm;
  },

  async update(id: string, input: UpdateAlarmInput): Promise<AlarmDTO> {
    const res = await apiClient.put<{ alarm: AlarmDTO }>(ENDPOINTS.ALARMS.UPDATE(id), input);
    return res.data.alarm;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.ALARMS.DELETE(id));
  },
};
