import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feedbackFormSchema, FeedbackFormData } from '../schemas/formSchemas';
import { useSendFeedback } from '../hooks/useFeedback';

export const FeedbackPage = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const sendFeedback = useSendFeedback();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      email: localStorage.getItem('feedback_email') || '',
      report: localStorage.getItem('feedback_text') || '',
    },
  });

  const watchedEmail = watch('email');
  const watchedReport = watch('report');

  useEffect(() => {
    localStorage.setItem('feedback_email', watchedEmail || '');
  }, [watchedEmail]);

  useEffect(() => {
    localStorage.setItem('feedback_text', watchedReport || '');
  }, [watchedReport]);

  const handleSend = async (values: FeedbackFormData) => {
    try {
      setSuccessMessage(null);
      await sendFeedback.mutateAsync(values);
      reset({ email: values.email, report: '' });
      localStorage.removeItem('feedback_text');
      setSuccessMessage('Feedback sent successfully.');
    } catch {
      // Error is surfaced from mutation state for inline rendering.
    }
  };

  return (
    <div className="flex flex-col h-full bg-background p-6 rounded-lg shadow-sm border border-surfaceHighlight max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-semibold text-text mb-6">Feedback</h2>

      <form className="space-y-4" onSubmit={handleSubmit(handleSend)}>
        <div>
          <label className="block text-sm font-medium text-text mb-1">Send to Email</label>
          <input
            type="email"
            {...register('email')}
            className="w-full h-10 px-3 py-2 bg-surface text-text rounded-md border border-surfaceHighlight focus:outline-none focus:border-primary transition-colors"
            placeholder="admin@example.com"
          />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">Feedback</label>
          <textarea
            {...register('report')}
            className="w-full h-48 px-3 py-2 bg-surface text-text rounded-md border border-surfaceHighlight focus:outline-none focus:border-primary transition-colors resize-none"
            placeholder="Write all the feedbacks you find..."
          />
          {errors.report && <p className="mt-1 text-xs text-red-400">{errors.report.message}</p>}
        </div>

        {sendFeedback.isError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {sendFeedback.error instanceof Error ? sendFeedback.error.message : 'Error sending feedback'}
          </div>
        )}

        {successMessage && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={sendFeedback.isPending}
          className={`w-full h-10 text-textInverse font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 flex items-center justify-center ${
            sendFeedback.isPending ? 'bg-primary/70 cursor-not-allowed' : 'bg-primary hover:bg-primaryHover'
          }`}
        >
          {sendFeedback.isPending ? 'Sending...' : 'Send Feedback'}
        </button>
      </form>
    </div>
  );
};
