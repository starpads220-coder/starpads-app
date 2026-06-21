import React from 'react';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

interface ItineraryWorkflowTasksProps {
  tasks: Task[];
}

export default function ItineraryWorkflowTasks({ tasks }: ItineraryWorkflowTasksProps) {
  return (
    <div className="flex flex-col">
      {tasks.map((task) => (
        <div key={task.id} className="srow">
          <div className={`chk ${task.completed ? 'on' : ''}`}></div>
          <div className="stxt">
            {task.title}
            <div style={{
              fontSize: '8px', 
              textTransform: 'uppercase', 
              fontWeight: 900, 
              marginTop: '1px',
              color: task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#3b82f6'
            }}>
              {task.priority} Priority
            </div>
          </div>
          <div className="bdg neu" style={{padding: '2px 6px', fontSize: '8px'}}>ID: {task.id}</div>
        </div>
      ))}
    </div>
  );
}
