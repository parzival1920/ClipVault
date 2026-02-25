import { supabase } from '../lib/supabase';

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
  user_id: string;
}

export const fetchClips = async (query?: string, type?: string): Promise<Clip[]> => {
  let q = supabase
    .from('clips')
    .select('*')
    .order('created_at', { ascending: false });

  if (type) {
    q = q.eq('file_type', type);
  }

  if (query) {
    q = q.or(`filename.ilike.%${query}%,ai_summary.ilike.%${query}%,ai_category.ilike.%${query}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

export const saveClip = async (clipData: any): Promise<void> => {
  // 1. Upload file to Supabase Storage
  const { id, filename, base64Data, ...rest } = clipData;
  const storagePath = `${id}-${filename}`;
  
  // Convert base64 to Blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray]);

  const { error: uploadError } = await supabase.storage
    .from('clips')
    .upload(storagePath, blob);

  if (uploadError) throw uploadError;

  // 2. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('clips')
    .getPublicUrl(storagePath);

  // 3. Save to Database
  const { error: dbError } = await supabase
    .from('clips')
    .insert([{
      ...rest,
      id,
      filename,
      storage_path: storagePath,
      thumbnail_url: rest.file_type === 'image' ? publicUrl : null,
    }]);

  if (dbError) throw dbError;
};

export const deleteClip = async (id: string, storagePath: string): Promise<void> => {
  // 1. Delete from Storage
  await supabase.storage.from('clips').remove([storagePath]);

  // 2. Delete from Database
  const { error } = await supabase
    .from('clips')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};
