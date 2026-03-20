import { api } from './api';

interface SendFeedbackPayload {
  email: string;
  report: string;
}

interface SendFeedbackResponse {
  success: boolean;
  data: {
    status: string;
  };
}

export const feedbackService = {
  async sendFeedback(payload: SendFeedbackPayload): Promise<string> {
    const res = await api.post<SendFeedbackResponse>('/feedback', payload);
    return res.data.status;
  },
};
