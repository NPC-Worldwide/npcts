import React from 'react';
import { X } from 'lucide-react';

interface Step {
    name: string;
    engine: 'python' | 'bash' | 'natural';
    code: string;
}

interface StepEditorProps {
    steps: Step[];
    onChange: (steps: Step[]) => void;
}

export const StepEditor: React.FC<StepEditorProps> = ({ 
    steps, 
    onChange 
}) => {
    const updateStep = (index: number, field: keyof Step, 
        value: string) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        onChange(newSteps);
    };

    const removeStep = (index: number) => {
        onChange(steps.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-4">
            {steps.map((step, i) => (
                <div key={i} className="p-4 bg-gray-900/50 
                    rounded border theme-border space-y-3">
                    <div className="flex justify-between 
                        items-center gap-2">
                        <input
                            className="theme-input p-1 text-sm 
                                font-medium flex-1"
                            value={step.name}
                            onChange={(e) => 
                                updateStep(i, 'name', e.target.value)
                            }
                            placeholder="step_name"
                        />
                        <button
                            onClick={() => removeStep(i)}
                            className="p-1 
                                theme-button-danger-subtle rounded"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <select
                        value={step.engine}
                        onChange={(e) => 
                            updateStep(i, 'engine', 
                                e.target.value as Step['engine'])
                        }
                        className="w-full theme-input p-2 
                            rounded text-sm"
                    >
                        <option value="python">Python</option>
                        <option value="bash">Bash</option>
                        <option value="natural">Natural Language</option>
                    </select>
                    <textarea
                        value={step.code}
                        onChange={(e) => 
                            updateStep(i, 'code', e.target.value)
                        }
                        className="w-full theme-input p-2 rounded 
                            font-mono text-sm min-h-[100px]"
                        placeholder={`Enter ${step.engine} code...`}
                    />
                </div>
            ))}
        </div>
    );
};
