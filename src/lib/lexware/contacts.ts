/**
 * Lexware Office Contacts API Handler
 * Elyson Sweets B2B portalindeki firmaları Lexware müşteri kartlarıyla senkronize eder.
 */

import { lexwareFetch } from './client';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export interface LexwareContact {
  id?: string;
  version?: number;
  roles: {
    customer?: {
      number?: number;
    };
  };
  company?: {
    name: string;
    taxNumber?: string;
    vatRegistrationId?: string;
  };
  person?: {
    salutation?: string;
    firstName?: string;
    lastName?: string;
  };
  addresses: {
    billing?: Array<{
      street: string;
      zip: string;
      city: string;
      countryCode: string;
    }>;
    shipping?: Array<{
      street: string;
      zip: string;
      city: string;
      countryCode: string;
    }>;
  };
  emailAddresses?: {
    business?: string[];
  };
  phoneNumbers?: {
    business?: string[];
  };
}

/**
 * Bir firma için Lexware Contact ID'sini döndürür.
 * Eğer daha önce oluşturulmamışsa, Lexware'de yeni müşteri kartı açar ve Supabase'e kaydeder.
 */
export async function getOrCreateLexwareContact(firmaId: string): Promise<string> {
  const supabase = createSupabaseServiceClient();

  const { data: firma, error } = await supabase
    .from('firmalar')
    .select('id, unvan, email, telefon, adres, sehir, posta_kodu, vergi_no, lexware_contact_id')
    .eq('id', firmaId)
    .single();

  if (error || !firma) {
    throw new Error(`Firma bulunamadı [ID: ${firmaId}]: ${error?.message}`);
  }

  // Zaten eşleşmişse doğrudan döndür
  if (firma.lexware_contact_id) {
    return firma.lexware_contact_id;
  }

  // Lexware için müşteri payload'u hazırla
  const companyName = firma.unvan?.trim() || 'B2B Kunde';
  const isVatId = firma.vergi_no?.trim().toUpperCase().startsWith('DE');

  const payload: LexwareContact = {
    version: 0,
    roles: {
      customer: {},
    },
    company: {
      name: companyName,
      ...(isVatId
        ? { vatRegistrationId: firma.vergi_no?.trim() }
        : firma.vergi_no ? { taxNumber: firma.vergi_no.trim() } : {}),
    },
    addresses: {
      billing: [
        {
          street: firma.adres?.trim() || 'Adresse nicht angegeben',
          zip: firma.posta_kodu?.trim() || '50667',
          city: firma.sehir?.trim() || 'Köln',
          countryCode: 'DE',
        },
      ],
    },
    ...(firma.email ? { emailAddresses: { business: [firma.email.trim()] } } : {}),
    ...(firma.telefon ? { phoneNumbers: { business: [firma.telefon.trim()] } } : {}),
  };

  const createdContact = await lexwareFetch<any>('/v1/contacts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!createdContact?.id) {
    throw new Error('Lexware müşteri kartı oluşturuldu ancak ID dönmedi.');
  }

  // Supabase'e kaydet
  await supabase
    .from('firmalar')
    .update({ lexware_contact_id: createdContact.id })
    .eq('id', firmaId);

  return createdContact.id;
}
