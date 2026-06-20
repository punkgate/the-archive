import { supabase } from '../lib/supabase';
import type { Entry, EntryListItem, SearchResult, ServiceResult } from '../types';
import { stripSymbols } from '../lib/extraction';

// ============================================================
// ENTRIES SERVICE
// ============================================================

export async function getEntries(userId: string): Promise<ServiceResult<EntryListItem[]>> {
  try {
    const { data, error } = await supabase
      .from('entries')
      .select(`
        id,
        title,
        raw_content,
        created_at,
        updated_at,
        entry_images(count),
        entry_entities(count)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const items: EntryListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      raw_content: row.raw_content,
      created_at: row.created_at,
      updated_at: row.updated_at,
      image_count: row.entry_images?.[0]?.count ?? 0,
      entity_count: row.entry_entities?.[0]?.count ?? 0,
    }));

    return { success: true, data: items };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getEntry(id: string, userId: string): Promise<ServiceResult<Entry>> {
  try {
    const { data, error } = await supabase
      .from('entries')
      .select(`
        *,
        entry_images(*),
        entry_entities(
          *,
          entity:entities(*)
        ),
        annotations(
          *,
          entity:entities(*)
        )
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Entry not found');

    return { success: true, data: data as unknown as Entry };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function createEntry(
  userId: string,
  title: string = '',
  content: string = '',
): Promise<ServiceResult<Entry>> {
  try {
    const raw_content = stripSymbols(content.replace(/<[^>]*>/g, ' ')).trim();

    const { data, error } = await supabase
      .from('entries')
      .insert({
        user_id: userId,
        title: title || 'Untitled',
        content,
        raw_content,
      })
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as Entry };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateEntry(
  id: string,
  userId: string,
  updates: Partial<Pick<Entry, 'title' | 'content' | 'raw_content'>>,
): Promise<ServiceResult<Entry>> {
  try {
    const payload: Record<string, string> = {};

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) {
      payload.content = updates.content;
      payload.raw_content = updates.raw_content
        ?? stripSymbols(updates.content.replace(/<[^>]*>/g, ' ')).trim();
    }

    const { data, error } = await supabase
      .from('entries')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as Entry };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteEntry(id: string, userId: string): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function searchEntries(
  userId: string,
  query: string,
): Promise<ServiceResult<SearchResult[]>> {
  try {
    if (!query.trim()) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .rpc('search_entries', {
        p_user_id: userId,
        p_query: query.trim(),
        p_limit: 20,
      });

    if (error) throw error;

    return { success: true, data: (data || []) as SearchResult[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
