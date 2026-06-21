import React from 'react';
import { Star, MessageSquare, AlertCircle } from 'lucide-react';
import './ChartSetup';

import NPSRatingList from './NPSRatingList';
import ExperienceSummary from './ExperienceSummary';
import GuestReviewFeed from './GuestReviewFeed';
import SatisfactionDonut from './SatisfactionDonut';
import IssueFrequencyTags from './IssueFrequencyTags';

const ratingsData = [
  { id: '1', name: 'James Wilson', role: 'Adventure Lead', score: 9.5, label: 'Promoter' },
  { id: '2', name: 'Sarah Chen', role: 'Luxury Guest', score: 8.8, label: 'Passive' },
  { id: '3', name: 'Mark Evans', role: 'Family Trip', score: 4.2, label: 'Detractor' },
];

const reviewsData = [
  { id: '1', name: 'Alice Thompson', comment: 'Absolutely incredible experience from start to finish. Our guide was extremely knowledgeable.', rating: 5, date: '2 days ago' },
  { id: '2', name: 'Robert Miller', comment: 'The logistics were seamless. Mara migration was life-changing.', rating: 5, date: '5 days ago' },
];

const satisfactionData = [
  { name: 'Excellent', value: 74, color: '#10b981' },
  { name: 'Good', value: 18, color: '#3b82f6' },
  { name: 'Average', value: 6, color: '#f59e0b' },
  { name: 'Poor', value: 2, color: '#ef4444' },
];

const issueTags = [
  { tag: 'WiFi Spotty', count: 14, severity: 'high' as const },
  { tag: 'Dusty Transit', count: 9, severity: 'medium' as const },
  { tag: 'Food Cold', count: 4, severity: 'low' as const },
  { tag: 'Bed Hard', count: 2, severity: 'low' as const },
];

export default function CSATMetricsBlock() {
  return (
    <>
      <div className="card-ref s6 bg-emerald-50/50 border border-emerald-100/50 flex flex-col pt-4 relative overflow-hidden">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0, color:'#10b981'}}>Guest Experience</div><div className="title m-0">NPS & Satisfaction Overview</div></div>
           <span className="bdg up">World-class standard</span>
         </div>
         <ExperienceSummary nps={82.4} excellentPercent={74} />
         <div className="mt-4 flex-1 min-h-[150px]">
            <SatisfactionDonut data={satisfactionData} />
         </div>
      </div>

      <div className="card-ref s3">
         <div className="lbl">Perfect 5-Star Ratio</div>
         <div className="num mt-1">74%</div>
         <div className="sub">Zero negative remarks</div>
         <div className="mt4"><span className="bdg up">Exceptional</span></div>
      </div>

      <div className="card-ref s3">
         <div className="lbl">Survey Completion</div>
         <div className="num mt-1">68%</div>
         <div className="sub">High engagement</div>
         <div className="prog-track mt-4"><div className="prog-fill bg-blue-500" style={{width: '68%'}}></div></div>
      </div>

      <div className="card-ref s6 flex flex-col">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Feedback</div><div className="title m-0">Recent Guest NPS Feedback</div></div>
           <Star size={14} className="text-yellow-500" />
         </div>
         <NPSRatingList ratings={ratingsData} />
      </div>

      <div className="card-ref s6 flex flex-col">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0}}>Reviews</div><div className="title m-0">Live Guest Review Stream</div></div>
           <MessageSquare size={14} className="text-blue-500" />
         </div>
         <GuestReviewFeed reviews={reviewsData} />
      </div>

      <div className="card-ref s8 flex flex-col">
         <div className="fx jb ac mb4">
           <div><div className="lbl" style={{margin:0, color:'#ef4444'}}>Sentiment Analysis</div><div className="title m-0">Negative Keyword Lexical Clustering</div></div>
           <AlertCircle size={14} className="text-red-500" />
         </div>
         <IssueFrequencyTags issues={issueTags} />
      </div>

      <div className="card-ref s4">
         <div className="lbl">Resolution Turnaround</div>
         <div className="title mb4">Response Speed</div>
         <div className="num mt-1">12h</div>
         <div className="sub">Time to address bad review</div>
         <div className="mt4"><span className="bdg neu">Within SLA</span></div>
      </div>
    </>
  );
}
