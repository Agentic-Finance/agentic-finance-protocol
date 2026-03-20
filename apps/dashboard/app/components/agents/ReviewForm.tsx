'use client';
import React, { useState } from 'react';
import { Star, Send } from 'lucide-react';

interface ReviewFormProps {
  onSubmit: (rating: number, comment: string) => Promise<void>;
  isSubmitting?: boolean;
}

export function ReviewForm({ onSubmit, isSubmitting }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    await onSubmit(rating, comment);
    setRating(0);
    setComment('');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-4">
      <div>
        <label className="text-xs font-medium text-slate-400 block mb-2">Rating</label>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i + 1)}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-0.5"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  i < (hoverRating || rating)
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 block mb-2">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          rows={3}
          className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/30 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={rating === 0 || isSubmitting}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-cyan-500 to-indigo-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        Submit Review
      </button>
    </form>
  );
}

export default ReviewForm;
