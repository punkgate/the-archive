import { supabase } from '../lib/supabase';
import { normalizeSlug } from '../lib/extraction';
import type {
  Entity,
  EntityType,
  EntityWithCount,
  EntryEntityJoin,
  ExtractedEntity,
  ServiceResult,
} from '../types';

// ============================================================
// ENTITIES SERVICE
// ============================================================

export async function upsertEntity(
  userId: string,
  type: EntityType,
  name: string,
): Promise<ServiceResult<Entity>> {
  try {
    const slug = normalizeSlug(name);

    const { data, error } = await supabase
      .from('entities')
      .upsert(
        { user_id: userId, type, name, slug },
        { onConflict: 'user_id,type,slug', ignoreDuplicates: false }
      )
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as Entity };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function linkEntityToEntry(
  entryId: string,
  entityId: string,
  userId: string,
  source: 'symbol' | 'annotation' | 'manual' = 'symbol',
): Promise<ServiceResult<EntryEntityJoin>> {
  try {
    const { data, error } = await supabase
      .from('entry_entities')
      .upsert(
        { entry_id: entryId, entity_id: entityId, user_id: userId, source },
        { onConflict: 'entry_id,entity_id', ignoreDuplicates: true }
      )
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as EntryEntityJoin };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function syncExtractedEntities(
  entryId: string,
  userId: string,
  extracted: ExtractedEntity[],
): Promise<ServiceResult<void>> {
  try {
    for (const e of extracted) {
      // Upsert entity
      const entityResult = await upsertEntity(userId, e.type, e.name);
      if (!entityResult.success) continue;

      // Link to entry
      await linkEntityToEntry(entryId, entityResult.data.id, userId, 'symbol');
    }

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getEntitiesForEntry(
  entryId: string,
  userId: string,
): Promise<ServiceResult<EntryEntityJoin[]>> {
  try {
    const { data, error } = await supabase
      .from('entry_entities')
      .select(`
        *,
        entity:entities(*)
      `)
      .eq('entry_id', entryId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: (data || []) as unknown as EntryEntityJoin[] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getAllEntities(userId: string): Promise<ServiceResult<EntityWithCount[]>> {
  try {
    const { data, error } = await supabase
      .rpc('get_entity_frequencies', { p_user_id: userId });

    if (error) throw error;

    // Fetch full entity records
    const entityIds = (data || []).map((r: any) => r.entity_id);
    if (entityIds.length === 0) return { success: true, data: [] };

    const { data: entities, error: entitiesError } = await supabase
      .from('entities')
      .select('*')
      .in('id', entityIds)
      .eq('user_id', userId);

    if (entitiesError) throw entitiesError;

    const freqMap = new Map<string, number>(
      (data || []).map((r: any) => [r.entity_id, Number(r.occurrence_count)])
    );

    const withCounts: EntityWithCount[] = (entities || []).map((e: Entity) => ({
      ...e,
      occurrence_count: freqMap.get(e.id) ?? 0,
    }));

    withCounts.sort((a, b) => b.occurrence_count - a.occurrence_count);

    return { success: true, data: withCounts };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getEntity(id: string, userId: string): Promise<ServiceResult<Entity>> {
  try {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    return { success: true, data: data as Entity };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getEntriesForEntity(
  entityId: string,
  userId: string,
): Promise<ServiceResult<Array<{ id: string; title: string; created_at: string }>>> {
  try {
    const { data, error } = await supabase
      .from('entry_entities')
      .select(`
        entry:entries(id, title, created_at)
      `)
      .eq('entity_id', entityId)
      .eq('user_id', userId);

    if (error) throw error;

    const entries = (data || [])
      .map((row: any) => row.entry)
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: entries };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function updateEntity(
  id: string,
  userId: string,
  updates: Partial<Pick<Entity, 'name' | 'description' | 'metadata'>>,
): Promise<ServiceResult<Entity>> {
  try {
    const payload: Partial<Entity> = { ...updates };
    if (updates.name) {
      payload.slug = normalizeSlug(updates.name);
    }

    const { data, error } = await supabase
      .from('entities')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) throw error;

    return { success: true, data: data as Entity };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function deleteEntity(id: string, userId: string): Promise<ServiceResult<void>> {
  try {
    const { error } = await supabase
      .from('entities')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true, data: undefined };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
