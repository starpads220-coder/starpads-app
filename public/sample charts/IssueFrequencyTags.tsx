"use client";

import React from 'react';

interface Issue {
  tag: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
}

interface IssueFrequencyTagsProps {
  issues: Issue[];
}

export default function IssueFrequencyTags({ issues }: IssueFrequencyTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {issues.map(iss => (
        <div key={iss.tag} className={`bdg ${iss.severity === 'high' ? 'dn' : iss.severity === 'medium' ? 'neu' : 'neu'}`}
          style={iss.severity === 'medium' ? {background: '#fff7ed', color: '#ea580c'} : undefined}
        >
          {iss.tag} <span className="ml-1 font-black">({iss.count})</span>
        </div>
      ))}
    </div>
  );
}
