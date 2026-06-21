import React from 'react';
import { Star } from 'lucide-react';

interface NPSRatingListProps {
  ratings: Array<{
    id: string;
    name: string;
    role: string;
    score: number;
    label: string;
    avatarUrl?: string;
  }>;
}

export default function NPSRatingList({ ratings }: NPSRatingListProps) {
  return (
    <div className="flex flex-col">
      {ratings.map((rating) => (
        <div key={rating.id} className="srow fx jb ac">
          <div className="fx ac gap-3">
            <div className="avatar" style={{backgroundColor: rating.score >= 9 ? '#10b981' : rating.score >= 7 ? '#3b82f6' : '#ef4444'}}>
              {rating.name.charAt(0)}
            </div>
            <div className="fxc">
              <span className="title m-0">{rating.name}</span>
              <span className="sub mt-0">{rating.role}</span>
            </div>
          </div>
          <div className="fx ac gap-2">
            <div className="fx ac g4">
              <Star size={10} fill="#fbbf24" stroke="#fbbf24" />
              <span className="num-sm">{rating.score.toFixed(1)}</span>
            </div>
            <span className={`bdg ${rating.label === 'Promoter' ? 'up' : rating.label === 'Passive' ? 'neu' : 'dn'}`}>
              {rating.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
