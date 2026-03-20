import { useMutation } from '@tanstack/react-query';
import { feedbackService } from '../services/feedbackService';

export const useSendFeedback = () => {
  return useMutation({
    mutationFn: feedbackService.sendFeedback,
  });
};
