'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface ReviewModalProps {
    isOpen: boolean;
    agentName: string;
    jobId: string;
    agentId: string;
    onClose: () => void;
    onSubmitted: () => void;
}

const RATING_LABELS = ['', 'Poor', 'Below average', 'Good', 'Great work!', 'Excellent!'];

function ReviewModal({ isOpen, agentName, jobId, agentId, onClose, onSubmitted }: ReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/marketplace/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId, agentId, rating, comment: comment.trim() || undefined }),
            });
            if (res.ok) {
                onSubmitted();
            }
        } catch (err) {
            console.error('Failed to submit review:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const displayRating = hoveredRating || rating;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.60) 100%)' }} onClick={onClose}>
            <div className="bg-[#151B27] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold text-lg">Rate {agentName}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-2 justify-center mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            className="transition-transform hover:scale-125 focus:outline-none"
                        >
                            {star <= displayRating ? (
                                <StarIconSolid className="w-10 h-10 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
                            ) : (
                                <StarIconOutline className="w-10 h-10 text-slate-600 hover:text-slate-500" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Rating label */}
                <p className="text-center text-sm text-slate-400 mb-5 h-5">
                    {displayRating > 0 ? RATING_LABELS[displayRating] : ''}
                </p>

                {/* Comment */}
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience (optional)..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm text-slate-300 placeholder:text-slate-600 outline-none focus:border-indigo-500/50 resize-none transition-colors"
                    rows={3}
                />

                {/* Actions */}
                <div className="flex gap-3 mt-5">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs font-bold rounded-xl transition-all uppercase tracking-widest"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={rating === 0 || isSubmitting}
                        className={`flex-1 px-4 py-3 font-bold text-xs rounded-xl transition-all uppercase tracking-widest ${
                            rating > 0 && !isSubmitting
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg'
                                : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ReviewModal;
