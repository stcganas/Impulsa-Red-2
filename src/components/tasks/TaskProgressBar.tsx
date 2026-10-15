import { motion } from 'motion/react';
import { cn } from "../../lib/utils";

interface TaskProgressBarProps {
  progress: number;
  required: number;
  completed: boolean;
}

export function TaskProgressBar({ progress, required, completed }: TaskProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (progress / required) * 100));
  
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className={completed ? "text-green-600" : "text-gray-500"}>
          Progreso
        </span>
        <span className={completed ? "text-green-600" : "text-gray-700"}>
          {Math.min(progress, required)} / {required}
        </span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            completed ? "bg-green-500" : 
            percentage >= 100 ? "bg-indigo-500" : "bg-blue-500"
          )}
        />
      </div>
    </div>
  );
}
