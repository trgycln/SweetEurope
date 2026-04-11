// Helper function to merge branch company data with parent company inherited data
export async function mergeBranchWithParentData(firma: any, supabase: any) {
  // If this is a branch (has parent_firma_id), fetch parent and merge inherited fields
  if (firma?.parent_firma_id) {
    try {
      const { data: parentFirma } = await supabase
        .from('firmalar')
        .select('instagram_url, linkedin_url, facebook_url, web_url, google_maps_url')
        .eq('id', firma.parent_firma_id)
        .single();

      if (parentFirma) {
        const merged = { ...firma };

        // Merge inherited URLs if flags are true
        if (firma.inherit_instagram_url && !firma.instagram_url) {
          merged.instagram_url = parentFirma.instagram_url;
          merged._inherited_instagram = true;
        }
        if (firma.inherit_linkedin_url && !firma.linkedin_url) {
          merged.linkedin_url = parentFirma.linkedin_url;
          merged._inherited_linkedin = true;
        }
        if (firma.inherit_facebook_url && !firma.facebook_url) {
          merged.facebook_url = parentFirma.facebook_url;
          merged._inherited_facebook = true;
        }
        if (firma.inherit_web_url && !firma.web_url) {
          merged.web_url = parentFirma.web_url;
          merged._inherited_web = true;
        }
        if (firma.inherit_google_maps_url && !firma.google_maps_url) {
          merged.google_maps_url = parentFirma.google_maps_url;
          merged._inherited_maps = true;
        }

        return merged;
      }
    } catch (error) {
      console.error('Error merging branch with parent data:', error);
    }
  }

  return firma;
}

// Helper to get the effective URL (either custom or inherited)
export function getEffectiveUrl(firma: any, field: 'instagram' | 'linkedin' | 'facebook' | 'web' | 'maps'): string | null {
  const fieldMap = {
    'instagram': 'instagram_url',
    'linkedin': 'linkedin_url',
    'facebook': 'facebook_url',
    'web': 'web_url',
    'maps': 'google_maps_url'
  };

  const urlField = fieldMap[field];
  const inheritField = `inherit_${field === 'maps' ? 'google_maps_url' : urlField.replace('_url', '')}`;

  // If custom value exists, use it
  if (firma[urlField]) return firma[urlField];

  // If inherited and parent_firma_id exists, mark as inherited
  if (firma[inheritField]) return `inherited:${firma.parent_firma_id}`;

  return null;
}
