// src/app/[locale]/admin/operasyon/siparisler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle, FiPlus } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
// src/app/[locale]/admin/operasyon/siparisler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle, FiPlus } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import StatusUpdateButton from './StatusUpdateButton'; // Stellen Sie sicher, dass dieser Pfad korrekt ist
import SiparisFiltreleri from './SiparisFiltreleri'; // Stellen Sie sicher, dass dieser Pfad korrekt ist
import { Enums, Tables, Database } from '@/lib/supabase/database.types'; // Database und Tables importieren
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/utils'; // utils importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import OrderPageWrapper from './OrderPageWrapper';
import OrderCheckbox from './OrderCheckbox';
import PaymentStatusButton from './PaymentStatusButton';
import { buildLoosePostgresRegex } from '@/lib/searchUtils';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

                                        {/* Aktionen (Status Update Buttons) */}
                                        <td className="px-6 py-4 text-sm space-x-2 whitespace-nowrap">
                                             {/* Zeigt Buttons basierend auf aktuellem Status */}
                                             {/* "Als versandt markieren" */}
                                             {(dbStatus === 'Beklemede' || dbStatus === 'processing' || dbStatus === 'Hazırlanıyor') && ( // 'Hazırlanıyor' hinzugefügt
                                                 <StatusUpdateButton
                                                     siparisId={siparis.id}
                                                     neuerStatus="Yola Çıktı" // Nächster Status
                                                     label={content.markShipped || "Als versandt markieren"}
                                                     icon={<FiTruck size={12}/>}
                                                     className="bg-purple-100 text-purple-700 hover:bg-purple-200" // Farbe angepasst
                                                 />
                                             )}
                                             {/* "Als zugestellt markieren" */}
                                             {dbStatus === 'Yola Çıktı' && (
                                                  <StatusUpdateButton
                                                      siparisId={siparis.id}
                                                      neuerStatus="Teslim Edildi" // Nächster Status
                                                      label={content.markDelivered || "Als zugestellt markieren"}
                                                      icon={<FiCheckCircle size={12}/>}
                                                      className="bg-green-100 text-green-700 hover:bg-green-200"
                                                  />
                                             )}
                                              {/* Optional: Stornieren Button */}
                                             {/* {(dbStatus === 'Beklemede' || dbStatus === 'processing') && ( ... )} */}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Optional: Paginierung hier */}
            </main>
        </OrderPageWrapper>
    );
}