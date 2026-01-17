export const getLanguage = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx': return 'typescript';
        case 'js':
        case 'jsx': return 'javascript';
        case 'py': return 'python';
        case 'go': return 'go';
        case 'rs': return 'rust';
        case 'c':
        case 'h': return 'c';
        case 'cpp':
        case 'cc':
        case 'cxx':
        case 'hpp': return 'cpp';
        case 'java': return 'java';
        case 'rb': return 'ruby';
        case 'php': return 'php';
        case 'sql': return 'sql';
        case 'html': return 'html';
        case 'css': return 'css';
        case 'json': return 'json';
        case 'md': return 'markdown';
        default: return 'text';
    }
};

export const getLanguageMetadata = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'ts':
        case 'tsx': return { color: 'text-blue-400', label: 'TS' };
        case 'js':
        case 'jsx': return { color: 'text-yellow-400', label: 'JS' };
        case 'py': return { color: 'text-blue-500', label: 'PY' };
        case 'go': return { color: 'text-cyan-400', label: 'GO' };
        case 'rs': return { color: 'text-orange-500', label: 'RS' };
        case 'c': return { color: 'text-blue-300', label: 'C' };
        case 'cpp':
        case 'cc':
        case 'cxx':
        case 'hpp': return { color: 'text-blue-600', label: 'C++' };
        case 'h': return { color: 'text-blue-300', label: 'H' };
        case 'java': return { color: 'text-red-500', label: '☕' };
        case 'rb': return { color: 'text-red-600', label: 'RB' };
        case 'php': return { color: 'text-purple-400', label: 'PHP' };
        case 'sql': return { color: 'text-pink-400', label: 'SQL' };
        case 'html': return { color: 'text-orange-400', label: 'HTML' };
        case 'css': return { color: 'text-blue-400', label: 'CSS' };
        case 'json': return { color: 'text-yellow-600', label: 'JSON' };
        default: return { color: 'text-muted-foreground', label: 'FILE' };
    }
};
