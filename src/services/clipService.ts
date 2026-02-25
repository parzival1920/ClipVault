export interface Clip {
  id: string;
  filename: string;
  file_type: 'image' | 'pdf' | 'text';
  file_size: number;
  storage_path: string;
  thumbnail_url?: string;
  ai_summary: string;
  ai_tags: string[];
  ai_category?: string;
  extracted_text?: string;
  created_at: string;
}

export const fetchClips = async (query?: string, type?: string): Promise<Clip[]> => {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (type) params.append('type', type);
  
  const response = await fetch(`/api/clips?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch clips');
  return response.json();
};

export const saveClip = async (clipData: any): Promise<void> => {
  const response = await fetch('/api/clips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(clipData),
  });
  if (!response.ok) throw new Error('Failed to save clip');
};

export const deleteClip = async (id: string): Promise<void> => {
  const response = await fetch(`/api/clips/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete clip');
};
