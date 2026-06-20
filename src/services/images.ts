import { supabase } from '../lib/supabase';
import type { EntryImage, ServiceResult } from '../types';

const BUCKET = 'archive-images';

// ============================================================
// IMAGES SERVICE
// ============================================================

export async function uploadImage(
  userId: string,
  entryId: string,
  file: File,
  position: number = 0,
): Promise<ServiceResult<EntryImage>> {
  try {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const storageKey = `${userId}/${entryId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storageKey, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

    // Get image dimensions
    const dimensions = await getImageDimensions(file);

    // Insert record
    const { data, error } = await supabase
      .from('entry_images')
      .insert({
        entry_id: entryId,
        user_id: userId,
        storage_key: storageKey,
        url: urlData.publicUrl,
        position,
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      })
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as EntryImage };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getImagesForEntry(
  entryId: string,
  userId: string,
): Promise<ServiceResult<EntryImage[]>> {
  try {
    const { data, error } = await supabase
      .from('entry_images')
      .select('*')
      .eq('entry_id', entryId)
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (error) throw error;

    return { success: true, data: (data || []) as EntryImage[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateImageCaption(
  id: string,
  userId: string,
  caption: string,
): Promise<ServiceResult<EntryImage>> {
  try {
    const { data, error } = await supabase
      .from('entry_images')
      .update({ caption })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as EntryImage };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function reorderImages(
  images: Array<{ id: string; position: number }>,
  userId: string,
): Promise<ServiceResult<void>> {
  try {
    for (const img of images) {
      const { error } = await supabase
        .from('entry_images')
        .update({ position: img.position })
        .eq('id', img.id)
        .eq('user_id', userId);

      if (error) throw error;
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteImage(
  id: string,
  storageKey: string,
  userId: string,
): Promise<ServiceResult<void>> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([storageKey]);

    if (storageError) throw storageError;

    // Delete record
    const { error } = await supabase
      .from('entry_images')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// ANNOTATION SERVICE — V3
// ============================================================
import type { Annotation } from '../types';

export async function createAnnotation(
  entryId: string,
  entityId: string,
  userId: string,
  startOffset: number,
  endOffset: number,
  selectedText: string,
): Promise<ServiceResult<Annotation>> {
  try {
    const { data, error } = await supabase
      .from('annotations')
      .insert({
        entry_id: entryId,
        entity_id: entityId,
        user_id: userId,
        start_offset: startOffset,
        end_offset: endOffset,
        selected_text: selectedText,
      })
      .select(`*, entity:entities(*)`)
      .single();

    if (error) throw error;

    // Also link entity to entry
    await supabase
      .from('entry_entities')
      .upsert(
        { entry_id: entryId, entity_id: entityId, user_id: userId, source: 'annotation' },
        { onConflict: 'entry_id,entity_id', ignoreDuplicates: true }
      );

    return { success: true, data: data as unknown as Annotation };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getAnnotationsForEntry(
  entryId: string,
  userId: string,
): Promise<ServiceResult<Annotation[]>> {
  try {
    const { data, error } = await supabase
      .from('annotations')
      .select(`*, entity:entities(*)`)
      .eq('entry_id', entryId)
      .eq('user_id', userId)
      .order('start_offset', { ascending: true });

    if (error) throw error;

    return { success: true, data: (data || []) as unknown as Annotation[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteAnnotation(
  id: string,
  userId: string,
): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('annotations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ============================================================
// HELPERS
// ============================================================
function getImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
