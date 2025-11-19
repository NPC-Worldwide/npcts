import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface JinxStep {
  name: string;
  engine: string;
  code: string;
}

interface JinxEditorProps {
  jinxName: string;
  description: string;
  inputs: string[];
  steps: JinxStep[];
  onNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  onInputsChange: (inputs: string[]) => void;
  onStepChange: (index: number, step: JinxStep) => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
}

export const JinxEditor: React.FC<JinxEditorProps> = ({
  jinxName,
  description,
  inputs,
  steps,
  onNameChange,
  onDescriptionChange,
  onInputsChange,
  onStepChange,
  onAddStep,
  onRemoveStep
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Jinx Name</label>
        <input
          type="text"
          value={jinxName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 
            rounded text-sm"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 
            rounded text-sm"
        />
      </div>
      
      <div>
        <label className="text-sm font-medium mb-1 block">
          Inputs (comma-separated)
        </label>
        <input
          type="text"
          value={inputs.join(', ')}
          onChange={(e) => onInputsChange(
            e.target.value.split(',').map(s => s.trim()).filter(Boolean)
          )}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 
            rounded text-sm"
        />
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium">Steps</label>
          <button
            onClick={onAddStep}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded 
              text-xs flex items-center gap-1"
          >
            <Plus size={14} /> Add Step
          </button>
        </div>
        
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-gray-400">Step {index + 1}</span>
                <button
                  onClick={() => onRemoveStep(index)}
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="space-y-2">
                <input
                  type="text"
                  value={step.name}
                  onChange={(e) => onStepChange(index, { ...step, name: e.target.value })}
                  placeholder="Step name"
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-700 
                    rounded text-sm"
                />
                
                <select
                  value={step.engine}
                  onChange={(e) => onStepChange(index, { ...step, engine: e.target.value })}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-700 
                    rounded text-sm"
                >
                  <option value="python">Python</option>
                  <option value="bash">Bash</option>
                  <option value="javascript">JavaScript</option>
                </select>
                
                <textarea
                  value={step.code}
                  onChange={(e) => onStepChange(index, { ...step, code: e.target.value })}
                  rows={4}
                  placeholder="Step code"
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-700 
                    rounded text-sm font-mono"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
