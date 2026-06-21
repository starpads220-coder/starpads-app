"use client";

import React from 'react';
import { Star, MessageSquare } from 'lucide-react';

interface Review {
  id: string;
  name: string;
  comment: string;
  rating: number;
  date: string;
}

interface GuestReviewFeedProps {
  reviews: Review[];
}

export default function GuestReviewFeed({ reviews }: GuestReviewFeedProps) {
  return (
    <div className="flex flex-col gap-2">
      {reviews.map((rev) => (
        <div key={rev.id} className="srow2 flex flex-col p-3 rounded-lg bg-slate-50/50 border border-slate-100/50 hover:bg-white transition-colors">
          <div className="fx jb ac mb-2">
            <div className="fxc">
              <span className="title m-0">{rev.name}</span>
              <span className="sub mt-0">{rev.date}</span>
            </div>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={9} 
                  fill={i < rev.rating ? "#fbbf24" : "#e2e8f0"} 
                  stroke={i < rev.rating ? "#fbbf24" : "#e2e8f0"} 
                />
              ))}
            </div>
          </div>
          <div className="fx g4">
             <div className="mt-0.5 text-slate-300 flex-shrink-0">
                <MessageSquare size={12} />
             </div>
             <p className="text-[10px] text-slate-500 italic leading-relaxed m-0">
               &ldquo;{rev.comment}&rdquo;
             </p>
          </div>
        </div>
      ))}
    </div>
  );
}
