import { api } from './api';

interface Chapter {
  chapter_id: string;
  chapter_name: string;
  created_at: string;
}

interface ListResponse {
  success: boolean;
  data: Chapter[];
}

export const chapterService = {
  async list(): Promise<Chapter[]> {
    const res = await api.get<ListResponse>('/chapters');
    return res.data;
  },
};
