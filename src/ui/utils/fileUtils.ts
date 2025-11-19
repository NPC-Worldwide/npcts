export const convertFileToBase64 = (file: File): Promise<{ dataUrl: string; base64: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve({ dataUrl: result, base64: result.split(',')[1] });
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
