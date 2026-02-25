import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  FileText, 
  Image as ImageIcon, 
  File as FileIcon,
  X,
  Loader2,
  Plus
} from 'lucide-react';
import { Clip, fetchClips, saveClip, deleteClip } from './services/clipService';
import { analyzeImage, analyzeText } from './services/aiService';

export default function App() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClips();
  }, [searchQuery, typeFilter]);

  const loadClips = async () => {
    try {
      const data = await fetchClips(searchQuery, typeFilter);
      setClips(data);
    } catch (error) {
      console.error("Failed to load clips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB.");
      return;
    }

    setUploading(true);
    try {
      const id = crypto.randomUUID();
      const fileType = getFileType(file);
      let aiAnalysis;
      let extractedText = '';
      let base64Data = '';

      // Convert to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      base64Data = await base64Promise;

      if (fileType === 'image') {
        aiAnalysis = await analyzeImage(base64Data, file.type);
      } else {
        extractedText = await file.text();
        aiAnalysis = await analyzeText(extractedText);
      }

      await saveClip({
        id,
        filename: file.name,
        file_type: fileType,
        file_size: file.size,
        base64Data,
        ai_summary: aiAnalysis.summary,
        ai_tags: aiAnalysis.tags,
        ai_category: aiAnalysis.category,
        extracted_text: extractedText
      });

      await loadClips();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to process file. Please check your API key.");
    } finally {
      setUploading(false);
    }
  };

  const getFileType = (file: File): 'image' | 'pdf' | 'text' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'text';
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this clip?")) return;
    try {
      await deleteClip(id);
      await loadClips();
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FAFAFA] selection:bg-[#2E5CFF]/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif italic text-7xl font-black tracking-tighter mb-4"
            >
              ClipVault
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[#A0A0A0] text-lg max-w-md"
            >
              Universal content capture with AI-powered organization. 
              Upload anything, find everything.
            </motion.p>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#4A4A4A]">System Status</span>
              <span className="text-xs font-mono text-emerald-500">AI ENGINE ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24">
        {/* Upload Zone */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative group cursor-pointer border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-500
              ${isDragging 
                ? 'border-[#2E5CFF] bg-[#2E5CFF]/5' 
                : 'border-white/5 hover:border-white/20 bg-white/[0.02]'
              }
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              accept="image/*,.pdf,.txt,.md"
            />
            
            <div className="flex flex-col items-center gap-6">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500
                ${uploading ? 'bg-[#2E5CFF] animate-pulse' : 'bg-white/5 group-hover:bg-[#2E5CFF]/20'}
              `}>
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Plus className={`w-8 h-8 transition-colors ${isDragging ? 'text-[#2E5CFF]' : 'text-white/40'}`} />
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-medium">
                  {uploading ? 'Analyzing Content...' : 'Drop content to vault'}
                </h3>
                <p className="text-[#4A4A4A] text-sm font-mono uppercase tracking-wider">
                  IMAGES • PDFS • TEXT • MAX 10MB
                </p>
              </div>
            </div>

            {/* Decorative corners */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-white/10" />
            <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-white/10" />
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-white/10" />
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-white/10" />
          </div>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A4A]" />
            <input 
              type="text"
              placeholder="Search by filename, summary, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-[#2E5CFF]/50 transition-colors"
            />
          </div>
          <div className="flex gap-4">
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-white/[0.03] border border-white/5 rounded-xl px-6 py-4 focus:outline-none focus:border-[#2E5CFF]/50 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Formats</option>
              <option value="image">Images</option>
              <option value="pdf">PDFs</option>
              <option value="text">Text</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 text-[#2E5CFF] animate-spin" />
          </div>
        ) : clips.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/5 rounded-2xl">
            <p className="text-[#4A4A4A] font-mono uppercase tracking-widest">Vault is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {clips.map((clip) => (
                <motion.div
                  key={clip.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden hover:border-[#2E5CFF]/30 transition-all duration-500"
                >
                  <div className="aspect-[16/10] bg-black/40 relative overflow-hidden flex items-center justify-center">
                    {clip.file_type === 'image' && clip.thumbnail_url ? (
                      <img 
                        src={clip.thumbnail_url} 
                        alt={clip.filename}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
                        {clip.file_type === 'pdf' ? <FileText size={48} /> : <FileIcon size={48} />}
                        <span className="font-mono text-[10px] uppercase tracking-widest">{clip.file_type}</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={() => setSelectedClip(clip)}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(clip.id)}
                        className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-medium truncate flex-1">{clip.filename}</h3>
                      <span className="text-[10px] font-mono bg-white/5 px-2 py-1 rounded text-[#4A4A4A] uppercase">
                        {clip.ai_category || 'Uncategorized'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[#A0A0A0] line-clamp-2 mb-4 leading-relaxed">
                      {clip.ai_summary}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {clip.ai_tags.slice(0, 3).map((tag, i) => (
                        <span key={i} className="text-[10px] font-mono text-[#2E5CFF] uppercase tracking-wider">
                          #{tag}
                        </span>
                      ))}
                      {clip.ai_tags.length > 3 && (
                        <span className="text-[10px] font-mono text-[#4A4A4A] uppercase">
                          +{clip.ai_tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedClip && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
            onClick={() => setSelectedClip(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0A0A0A] border border-white/10 w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Side */}
              <div className="md:w-3/5 bg-black flex items-center justify-center p-8 border-b md:border-b-0 md:border-r border-white/10">
                {selectedClip.file_type === 'image' && selectedClip.thumbnail_url ? (
                  <img 
                    src={selectedClip.thumbnail_url} 
                    alt={selectedClip.filename}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-6 text-[#4A4A4A]">
                    {selectedClip.file_type === 'pdf' ? <FileText size={120} /> : <FileIcon size={120} />}
                    <div className="text-center">
                      <p className="font-mono text-xs uppercase tracking-[0.3em] mb-2">Source Content</p>
                      <p className="text-white/40 text-sm">{selectedClip.filename}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Side */}
              <div className="md:w-2/5 p-10 overflow-y-auto">
                <div className="flex justify-between items-start mb-12">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-[#2E5CFF] uppercase tracking-[0.2em]">AI Intelligence</span>
                    <h2 className="text-2xl font-bold tracking-tight">{selectedClip.filename}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedClip(null)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-10">
                  <section>
                    <h4 className="text-[10px] font-mono text-[#4A4A4A] uppercase tracking-[0.2em] mb-4">Executive Summary</h4>
                    <p className="text-[#A0A0A0] leading-relaxed italic">
                      "{selectedClip.ai_summary}"
                    </p>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-mono text-[#4A4A4A] uppercase tracking-[0.2em] mb-4">Categorization</h4>
                    <div className="inline-block px-4 py-2 bg-[#2E5CFF]/10 border border-[#2E5CFF]/20 rounded-lg">
                      <span className="text-sm font-medium text-[#2E5CFF] uppercase tracking-wider">
                        {selectedClip.ai_category}
                      </span>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-[10px] font-mono text-[#4A4A4A] uppercase tracking-[0.2em] mb-4">Semantic Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedClip.ai_tags.map((tag, i) => (
                        <span key={i} className="px-3 py-1.5 bg-white/5 rounded-full text-xs text-white/60">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="pt-10 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h5 className="text-[10px] font-mono text-[#4A4A4A] uppercase tracking-[0.2em] mb-1">Format</h5>
                        <p className="text-xs uppercase">{selectedClip.file_type}</p>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-mono text-[#4A4A4A] uppercase tracking-[0.2em] mb-1">Payload</h5>
                        <p className="text-xs">{(selectedClip.file_size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
