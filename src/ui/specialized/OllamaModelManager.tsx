import React, { useState, useEffect } from 'react';
import { DownloadCloud, Trash2 } from 'lucide-react';

export const OllamaModelManager: React.FC = () => {
    const [models, setModels] = useState<any[]>([]);
    const [pullName, setPullName] = useState('');
    const [pulling, setPulling] = useState(false);
    const [progress, setProgress] = useState<any>(null);

    const fetchModels = async () => {
        const result = await (window as any).api
            .getLocalOllamaModels();
        if (result && !result.error) {
            setModels(result);
        }
    };

    useEffect(() => {
        fetchModels();
    }, []);

    const handlePull = async () => {
        if (!pullName.trim() || pulling) return;
        setPulling(true);
        setProgress({ status: 'Starting...' });
        await (window as any).api.pullOllamaModel({ 
            model: pullName 
        });
    };

    const handleDelete = async (modelName: string) => {
        await (window as any).api.deleteOllamaModel({ 
            model: modelName 
        });
        fetchModels();
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={pullName}
                    onChange={(e) => setPullName(e.target.value)}
                    className="flex-1 theme-input p-2"
                    placeholder="e.g., llama3.1"
                    disabled={pulling}
                />
                <button
                    onClick={handlePull}
                    disabled={pulling || !pullName.trim()}
                    className="theme-button-primary px-4 py-2 
                        disabled:opacity-50"
                >
                    <DownloadCloud size={16} />
                </button>
            </div>

            {progress && (
                <div className="p-3 bg-gray-800 rounded">
                    <p className="text-sm">{progress.status}</p>
                </div>
            )}

            <div className="space-y-2">
                {models.map(model => (
                    <div key={model.name} 
                        className="flex justify-between 
                            items-center p-3 bg-gray-800 rounded">
                        <div>
                            <p className="font-semibold">
                                {model.name}
                            </p>
                            <p className="text-xs text-gray-500">
                                {(model.size / 1e9).toFixed(2)} GB
                            </p>
                        </div>
                        <button
                            onClick={() => handleDelete(model.name)}
                            className="p-2 text-red-500 
                                hover:text-red-400"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
