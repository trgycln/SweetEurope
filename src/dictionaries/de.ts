// src/dictionaries/de.ts (Vollständig & Korrigiert)

export const dictionary = {
  navigation: {
    home: 'Startseite',
    products: 'Produkte',
    about: 'Über uns',
    contact: 'Kontakt',
    menu: 'Menü',
    partnerPortal: 'Partnerportal',
    search: 'Suche',
  },
  notifications: {
        title: "Benachrichtigungen",
        markAllAsRead: "Alle als gelesen markieren",
        noNewNotifications: "Keine neuen Benachrichtigungen.",
        errorLoading: "Fehler beim Laden.",
        viewDetails: "Details ansehen", // Fallback-Linktext
    },
  ueberUnsPage: {
    // --- Hero Section ---
    title: 'Unsere Geschichte & Werte', // Zuvor kullanılan
    heroSubtitle: 'HANDWERKSKUNST AUS TRADITION', // Zuvor düzeltilen

    // --- Mission Section ---
    missionTitle: 'Unsere Mission', // YENİ EKLENDİ
    missionP1: 'Unsere Mission ist es, die Premium-Patisserie-Kultur in Deutschland zugänglich zu machen. Wir bieten unseren Partnern nicht nur Produkte, sondern ein komplettes Erlebnis, das auf Qualität, Zuverlässigkeit und Exklusivität basiert.', // YENİ EKLENDİ

    // --- Story Section ---
    storyTitle: 'Von der Manufaktur zum Marktführer', // YENİ EKLENDİ
    storyP1: 'ElysonSweets wurde 2010 als kleine Manufaktur in Berlin gegründet, angetrieben von der Leidenschaft, traditionelle Rezepte mit moderner Ästhetik zu verbinden. Jedes Rezept wurde über Generationen perfektioniert.', // YENİ EKLENDİ
    storyP2: 'Heute sind wir stolz darauf, ein wachsendes Netzwerk von Geschäftspartnern in ganz Deutschland zu beliefern und unsere kompromisslose Verpflichtung zur Qualität beizubehalten, während wir expandieren.', // YENİ EKLENDİ

    // --- Image Alts (Resim Açıklamaları) ---
    image1Alt: 'ElysonSweets Konditor bei der Handarbeit an einer Torte.', // YENİ EKLENDİ
    image2Alt: 'Historische Aufnahme der ersten ElysonSweets Manufaktur-Küche.', // YENİ EKLENDİ

    // --- Zuvor Düzeltilmiş Diğer Anahtarlar ---
    section1Title: 'Das Herz von ElysonSweets',
    section1Text: 'Wir wählen nur die feinsten Zutaten und garantieren meisterhafte Handwerkskunst in jeder Kreation. Qualität ist kein Versprechen, sondern unser Standard.',
  },

  loginPage: {
    title: "ElysonSweets", // KORRIGIERT: Name geändert
    subtitle: "Willkommen im Admin-Panel",
    emailLabel: "E-Mail-Adresse",
    passwordLabel: "Passwort",
    errorTitle: "Anmeldung fehlgeschlagen",
    errorMessage: "Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Angaben.",
    invalidCredentialsError: "E-Mail oder Passwort falsch. Bitte versuchen Sie es erneut.",
    submitButton: "Anmelden",
    submittingButton: "Anmeldung läuft...",
    forgotPasswordLink: "Passwort vergessen?",
    emailPlaceholder: "admin@example.com",
    passwordPlaceholder: "••••••••",
    unauthorizedError: 'Sie sind nicht berechtigt, auf diese Seite zuzugreifen.',
    rememberMe: 'Angemeldet bleiben',
    backToWebsite: 'Zurück zur Website',
  },

  portal: {
    productDetailPage: {
        sampleRequest: "Muster anfragen",
        sampleRequested: "Muster angefragt",
        // --- NEUE TEXTE ---
        yourPrice: "Ihr Preis (Netto)",
        availability: "Verfügbarkeit",
        availabilityInStock: "Auf Lager",
        availabilityLowStock: "Wenig Bestand",
        availabilityOutOfStock: "Ausverkauft",
        
        // ------------------
    },
    catalogPage: { // <--- UND DIESER SCHLÜSSEL MUSS HIER DRIN SEIN
        title: "Produktkatalog",
        description: "Durchstöbern Sie unser komplettes Produktsortiment.",
        searchPlaceholder: "Produkt nach Name oder Code suchen...",
        allCategories: "Alle Kategorien",
        noProductsFoundFilter: "Keine Produkte für die aktuellen Filter gefunden.",
        noProductsFound: "Derzeit sind keine Produkte im Katalog verfügbar.",
        toggleFavoriteAdd: "Zu Favoriten hinzufügen",
        toggleFavoriteRemove: "Von Favoriten entfernen",
        viewDetails: "Details ansehen",
        backToList: "Zurück zum Katalog",
    },
    newOrderPage: {
      title: 'Neue Bestellung erstellen',
      subtitle: 'Stellen Sie Ihren Warenkorb aus dem Katalog zusammen.',
      searchPlaceholder: 'Nach Produktname oder -code suchen...',
      favoritesButton: 'Meine Favoriten',
      stockStatus: {
        inStock: 'Auf Lager',
        lowStock: 'Wenig Lagerbestand',
        outOfStock: 'Ausverkauft',
        addToCart: "In den Warenkorb", // Button-Text
        addedToCart: "sepete eklendi!", // Toast-Nachricht (oder "zum Warenkorb hinzugefügt!")
        stockNotAvailable: "Stok yetersiz! Maksimum %{stock} adet.", // Warnung
        productOutOfStock: "Dieses Produkt ist ausverkauft.",
      },
      noProductsFound: 'Keine Produkte für diese Kriterien gefunden.',
      cartTitle: 'Ihr Warenkorb',
      cartEmpty: 'Ihr Warenkorb ist leer.',
      cartTotal: 'Gesamt:',
      cartDiscountApplied: 'Ihr persönlicher Rabatt von %{discount}% wurde angewendet.',
      confirmOrderButton: 'Bestellung bestätigen',
      processingOrder: 'Bestellung wird bearbeitet...',
      error: {
        stockNotAvailable: 'Nicht genügend Lagerbestand! Maximal %{stock} Einheiten verfügbar.',
        productOutOfStock: 'Dieses Produkt ist ausverkauft.',
        cartEmpty: 'Bitte fügen Sie Produkte zum Warenkorb hinzu, um eine Bestellung aufzugeben.',
      },
    },
    ordersPage: {
      title: 'Meine Bestellungen',
      subtitle: 'Verfolgen Sie hier alle Ihre vergangenen und aktuellen Bestellungen.',
      newOrderButton: 'Neue Bestellung',
      loadError: 'Beim Laden Ihrer Bestellungen ist ein Fehler aufgetreten.',
      noOrders: 'Sie haben noch keine Bestellungen aufgegeben.',
      noOrdersForFilter: 'Für Ihre Filterkriterien wurden keine Bestellungen gefunden.',
      orderId: 'Bestell-ID',
      orderDate: 'Datum',
      totalAmount: 'Gesamtbetrag',
      status: 'Status',
      searchPlaceholder: 'Nach Bestell-ID suchen...',
      filterByStatus: 'Nach Status filtern',
      allStatuses: 'Alle Status',
      page: 'Seite',
      of: 'von',
      previous: 'Zurück',
      next: 'Weiter',
    },
    orderDetailsPage: {
      backToList: 'Zurück zur Bestellliste',
      title: 'Bestellung',
      creationDate: 'Erstellt am',
      orderItems: 'Bestellpositionen',
      product: 'Produkt',
      quantity: 'Menge',
      unitPrice: 'Stückpreis',
      lineTotal: 'Gesamt',
      subtotal: 'Zwischensumme',
      vat: 'MwSt.',
      grandTotal: 'Gesamtsumme',
      customerInfo: 'Kundeninformation',
      deliveryInfo: 'Lieferinformation',
    },
    requestsPage: {
        title: "Meine Anfragen",
        description: "Verfolgen Sie Ihre Musteranfragen und reichen Sie neue Produktideen ein.",
        // Tab 1: Musteranfragen
        tabSampleRequests: "Musteranfragen",
        requestDate: "Anfragedatum",
        rejectionReason: "Ablehnungsgrund",
        noSampleRequests: "Sie haben noch keine Muster angefragt.",
        sampleStatuses: {
            "Yeni Talep": "Neue Anfrage",
            "Onaylandı": "Bestätigt",
            "Hazırlanıyor": "In Vorbereitung",
            "Gönderildi": "Versendet",
            "İptal Edildi": "Abgelehnt"
        },
        // Tab 2: Neue Produktanfrage
        tabNewProduct: "Neue Produktanfrage",
        // Aktionen
        cancelButton: "Stornieren",
        editButton: "Bearbeiten",
        deleteButton: "Löschen",
        // Bestätigungen
        cancelConfirm: "Möchten Sie diese Anfrage wirklich stornieren?",
        deleteConfirm: "Möchten Sie diese Produktanfrage wirklich löschen?",
        // Status-Feedback
        requestCancelled: "Anfrage storniert",
        requestDeleted: "Anfrage gelöscht",
        errorOccurred: "Ein Fehler ist aufgetreten",
        editProduct: { // Eigener Abschnitt für die Bearbeiten-Seite
            title: "Produktanfrage bearbeiten",
            description: "Aktualisieren Sie die Details Ihrer Anfrage.",
            submitting: "Wird gespeichert...",
            submitButton: "Änderungen speichern"
        },
        newProduct: { // Korrekt verschachtelt
            newProductIntro: "Haben Sie eine Produktidee oder vermissen Sie einen bestimmten Artikel in unserem Sortiment? Teilen Sie es uns mit!",
            newProductName: "Produktname",
            newProductCategory: "Kategorievorschlag",
            newProductDescription: "Beschreibung",
            newProductEstimate: "Geschätzte Abnahme (pro Woche)",
            newProductLink: "Referenzlink (Bild oder Webseite)",
            submitButton: "Anfrage senden",
            submitting: "Wird gesendet...",
            formTitle: "Neue Produktanfrage einreichen", // Titel für das Formular
            submittedRequests: "Ihre eingereichten Anfragen", // Titel für die Liste
            noSubmittedRequests: "Sie haben noch keine Produktanfragen eingereicht.",
            adminNote: "Antwort von uns:",
            productStatuses: { // Status-Texte für Produktanfragen
                "Yeni": "Neu",
                "Değerlendiriliyor": "Wird geprüft",
                "Onaylandı": "Akzeptiert",
                "Reddedildi": "Abgelehnt"
            }
        }
    },
    sidebar: {
      title: "Partner-Portal",
      dashboard: "Dashboard",
      orders: "Meine Bestellungen",
      products: "Produktkatalog",
      requests: "Meine Anfragen",
      performance: "Meine Performance",
      materials: "Materialien",
      customers: "Meine Kunden",
      tasks: "Meine Aufgaben",
      stock: "Mein Bestand",
      finance: "Meine Finanzen",
    },
    header: {
      titleSuffix: "Portal",
      logout: "Abmelden",
      cartTitle: "Warenkorb",
    },
    dashboard: {
      // ++ NEUE TEXTE FÜR SCHNELLBESTELLUNG ++
            quickOrderTitle: "Schnellbestellung", // Titel des Widgets
            searchProductPlaceholder: "Produktname oder Code suchen...", // Platzhalter für Suchfeld
            addSelectedToCart: "Auswahl zum Warenkorb hinzufügen", // Button-Text (ohne Zahl)
            addNItemsToCart: "{count} Artikel zum Warenkorb hinzufügen", // Button-Text (mit Zahl)
            noProductsFound: "Keine Produkte für Ihre Suche gefunden.", // Meldung, wenn Suche leer ist
            pleaseSelectItems: "Bitte Artikel auswählen.", // Fehlermeldung, wenn keine Menge > 0
            stockWarning: "Nicht genügend Lagerbestand! Max. {stock} verfügbar.", // Warnung bei Mengeneingabe
            itemRemoved: "Artikel aus Auswahl entfernt.", // Toast-Nachricht (optional)
            addingToCart: "Wird hinzugefügt...", // Text für Button während des Ladens
      viewOpenOrders: "Offene Bestellungen",
      myFavorites: "Meine Favoriten",
      openSampleRequests: "Offene Musteranfragen",
      viewFavorites: "Favoriten ansehen", // Text für den Link/Button
      viewRequests: "Anfragen ansehen",
      orderDetails: "Details ansehen",
      welcome: "Willkommen, ",
      subtitle: "Hier ist eine Übersicht Ihrer letzten Aktivitäten.",
      newOrderButton: "Neue Bestellung aufgeben",
      announcementsTitle: "Ankündigungen",
      announcementsPlaceholder: "Zukünftige Ankündigungen und Aktionen werden hier angezeigt.",
      recentOrdersTitle: "Letzte Bestellungen",
      noOrders: "Sie haben noch keine Bestellungen aufgegeben.",
      ordersPlaceholder: "Bestellliste wird hier angezeigt.",
      pendingBalance: "Offener Saldo",
      openOrders: "Offene Bestellungen",
      newOrderButtonValue: "Jetzt einkaufen",
      materialsWidget: { // Korrekt verschachtelt
        title: "Neueste Materialien",
        viewAll: "Alle ansehen",
        noMaterials: "Keine neuen Materialien.",
      },
    },
    materialsPage: {
        title: "Marketingmaterialien",
        description: "Hier finden Sie nützliche Materialien wie Broschüren, Preislisten und Bilder.",
        noMaterials: "Aktuell sind keine Marketingmaterialien verfügbar.",
        download: "Herunterladen",
    },
  }, // <-- Ende 'portal' Objekt
  invoices: {
    status: {
      pending: 'Ausstehend',
      paid: 'Bezahlt',
      overdue: 'Überfällig',
      cancelled: 'Storniert'
    },
  },
  pnlReportPage: {
    pageTitle: "Gewinn & Verlust Bericht",
    pageSubtitle: "Die finanzielle Gesundheit deines Unternehmens auf einen Blick.",
    filterLabel: "Zeitraum:",
    periodThisMonth: "Dieser Monat",
    periodLastMonth: "Letzter Monat",
    periodLast3Months: "Letzte 3 Monate",
    periodLast6Months: "Letzte 6 Monate",
    periodThisYear: "Dieses Jahr",
    periodLastYear: "Letztes Jahr",
    customPeriod: "Benutzerdefiniert",
    totalGrossRevenue: "Bruttoumsatz",
    totalGrossRevenueTooltip: "Gesamtumsatz inkl. MwSt.",
    totalRevenue: "Nettoumsatz",
    totalRevenueTooltip: "Nettoumsatz nach Abzug von MwSt., Retouren und Rabatten",
    totalCogs: "Warenkosten",
    grossProfit: "Bruttogewinn",
    opExHeader: "Betriebsausgaben",
    totalOpEx: "Gesamtausgaben",
    netProfit: "Nettogewinn",
    netLoss: "Nettoverlust",
    margin: "Marge",
    showDetails: "Details anzeigen",
    hideDetails: "Details ausblenden",
    exportPDF: "Als PDF exportieren",
    errorLoading: "Bericht konnte nicht geladen werden.",
    accessDenied: "Zugriff verweigert",
    backButton: "Zurück zu Berichten",
    dateFrom: "Von:",
    dateTo: "Bis:",
    applyFilter: "Anwenden",
    detailedBreakdown: "Detaillierte Aufschlüsselung",
    revenueSection: "Einnahmen",
    expensesSection: "Ausgaben",
    noExpenses: "Keine Ausgaben im gewählten Zeitraum",
    expenseCategory: "Kategorie",
    expenseAmount: "Betrag",
    expensePercentage: "Anteil an Gesamtausgaben"
  },
  adminSidebar: {
    title: "Admin-Panel",
    mainMenu: "Hauptmenü",
    crm: "CRM & Kundenverwaltung",
    management: "Verwaltung",
    operations: "Betrieb",
    productManagement: "Produktverwaltung",
    pricing: "Preisgestaltung",
    marketing: "Marketing",
    finances: "Finanzen",
    settings: "Einstellungen",
    dashboard: "Dashboard",
    customers: "Kunden",
    applications: "Anwendungen",
    tasks: "Aufgaben",
    products: "Produkte",
    categories: "Kategorien",
    orders: "Bestellungen",
    templates: "Vorlagen",
    announcements: "Ankündigungen",
    marketingMaterials: "Marketingmaterial",
    sampleRequests: "Musteranfragen",
    productRequests: "Produktanfragen",
    reviews: "Bewertungen",
    expenses: "Ausgaben",
    reporting: "Berichterstattung",
    // Preisgestaltung Untermenüs
    pricingHub: "Preis-Hub",
    priceCalculation: "Preisberechnung",
    priceRequests: "Preisanfragen",
    priceExceptions: "Preisausnahmen",
    priceRules: "Preisregeln",
    // Einstellungen Untermenüs
    systemSettings: "Systemeinstellungen",
    profile: "Profil",
    customerProfiles: "Kundenprofile",
    profileAssignments: "Profilzuweisungen",
  },

  // KORREKTUR: adminHeader auf die oberste Ebene verschoben
  adminHeader: {
    logout: "Abmelden",
  },

  adminDashboard: {
    noOverdueTasks: "Aktuell keine überfälligen Aufgaben.", // Für die leere Liste
        dueDate: "Fällig am:", // Präfix für das Datum
        viewAllTasks: "Alle Aufgaben anzeigen", // Link-Text
    cardNewApplications: "Neue Partneranträge",
        cardOpenSampleRequests: "Offene Musteranfragen",
        cardNewProductRequests: "Neue Produktanfragen", // Nur wenn Tabelle existiert
        viewApplications: "Anträge prüfen",
        viewSampleRequests: "Muster prüfen",
        viewProductRequests: "Anfragen prüfen",
        actionNewProduct: "Neues Produkt", // Für Schnellaktion
    // KORREKTUR: productRequestsPage korrekt hier platziert
    productRequestsPage: {
        title: "Neue Produktanfragen",
        description: "Von Partnern eingereichte Produktideen.",
        noRequests: "Keine Produktanfragen gefunden.",
        noRequestsFilter: "Keine Anfragen für diese Filter gefunden.",
        statusOptions: {
            "Yeni": "Neu",
            "Değerlendiriliyor": "Wird geprüft",
            "Onaylandı": "Akzeptiert",
            "Reddedildi": "Abgelehnt"
        }
    },
    // KORREKTUR: sampleRequestsPage korrekt hier platziert
    sampleRequestsPage: {
      title: "Musteranfragen",
      description: "Anfragen aufgelistet.",
      noRequests: "Keine Anfragen gefunden.",
      noRequestsFilter: "Keine Anfragen für Filter gefunden.",
      tryChangingFilters: "Versuchen Sie, Ihre Filter anzupassen.",
      loadError: "Daten konnten nicht geladen werden. Siehe Server-Logs.",
      unknownCompany: "Unbekannt",
      cancelReasonLabel: "Grund:",
  cancelPrompt: "Bitte geben Sie einen Ablehnungsgrund ein (z. B. 'Produkt nicht auf Lager'):",
  emptyReasonError: "Begründung darf nicht leer sein.",
      tableHeaders: {
        company: "Firma",
        product: "Produkt",
        sku: "Artikel-Nr.",
        requestDate: "Anfragedatum",
        status: "Status",
        actions: "Aktionen",
      },
      filter: {
        searchPlaceholder: "Firma oder Produkt suchen...",
        allCompanies: "Alle Firmen",
        allStatuses: "Alle Status",
      },
      actionsLabels: {
        confirm: "Bestätigen",
        prepare: "Vorbereiten",
        send: "Senden",
        cancel: "Ablehnen",
      },
      statuses: {
          "Yeni Talep": "Neue Anfrage",
          "Onaylandı": "Bestätigt",
          "Hazırlanıyor": "In Vorbereitung",
          "Gönderildi": "Versendet",
          "İptal Edildi": "Abgelehnt",
      },
      statusOptions: { // KORREKTUR: statusOptions ist jetzt parallel zu statuses
          "Yeni Talep": "Neue Anfrage",
          "Onaylandı": "Bestätigt",
          "Hazırlanıyor": "In Vorbereitung",
          "Gönderildi": "Versendet",
          "İptal Edildi": "Abgelehnt"
      }
    },
    
    // Bestehende adminDashboard Einträge
    title: 'Admin Dashboard',
    sidebar: {
      dashboard: "Übersicht",
      applications: 'Partneranträge',
      products: 'Produktverwaltung',
      orders: 'Bestellungen',
      partners: 'Partner',
      // KORREKTUR: Falsch verschachteltes sampleRequestsPage-Objekt von hier entfernt
    },
    crmPage: {
      title: 'Kundenverwaltung (CRM)',
      companiesFound: 'Firmen gefunden.',
      newCompany: 'Neue Firma',
      noCompaniesTitle: 'Noch keine Firmen erfasst',
      noCompaniesDesc: 'Fügen Sie eine neue Firma hinzu, um zu beginnen.',
      noCompaniesFilterTitle: 'Keine Firmen für Filter gefunden',
      noCompaniesFilterDesc: 'Versuchen Sie, Ihre Suchkriterien zu ändern.',
      searchPlaceholder: 'Nach Firmenname suchen...',
      allStatusesLabel: 'Alle Status',
      detailSubtitle: 'Firmendetails & Verwaltung',
      tabs: {
        generalInfo: 'Allgemeine Informationen',
        activities: 'Aktivitäten',
        contacts: 'Kontakte',
        orders: 'Bestellungen',
        tasks: 'Aufgaben',
      },
      companyName: 'Firma',
      category: 'Kategorie',
      phone: 'Telefon',
      responsible: 'Verantwortlich',
      status: 'Status',
      noPhone: 'Kein Telefon',
      notAssigned: 'Nicht zugewiesen',
      unknown: 'Unbekannt',
      responsiblePerson: 'Verantwortlich: ',
      statusOptions: {
        'Potansiyel': 'Potenzial',
        'İlk Temas': 'Erstkontakt',
        'Numune Sunuldu': 'Muster eingereicht',
        'Teklif Verildi': 'Angebot abgegeben',
        'Anlaşma Sağlandı': 'Vereinbarung erreicht',
        'Pasif': 'Inaktiv',
      },
    },
    partnersPage: {
      title: 'Partnerverwaltung',
      companyName: 'Unternehmen',
      contactPerson: 'Ansprechpartner',
      email: 'E-Mail',
      totalOrders: 'Bestellungen gesamt',
      totalRevenue: 'Umsatz gesamt',
      status: 'Status',
    },
    applicationsPage: {
      title: 'Neue Partneranträge',
      company: 'Unternehmen',
      contact: 'Ansprechpartner',
      email: 'E-Mail',
      status: 'Status',
      date: 'Datum',
      actions: 'Aktionen',
      approve: 'Genehmigen',
      reject: 'Ablehnen',
      approving: 'Wird genehmigt...',
      rejecting: 'Wird abgelehnt...',
      approved: 'Genehmigt',
      noApplications: 'Aktuell keine neuen Anträge.',
    },
    productsPage: {
      title: 'Produktverwaltung',
      addProduct: 'Neues Produkt hinzufügen',
      productName: 'Produktname',
      category: 'Kategorie',
      price: 'Preis',
      stock: 'Lagerbestand',
      actions: 'Aktionen',
      edit: 'Bearbeiten',
      delete: 'Löschen',
      modalTitle: 'Neues Produkt erstellen',
      modalTitleEdit: 'Produkt bearbeiten',
      imageUrl: 'Bild-URL',
      save: 'Speichern',
      cancel: 'Abbrechen',
      deleteConfirmation: "'{productName}' ürününü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.",
      deleting: 'Wird gelöscht...',
      imageUpload: 'Bild hochladen',
      imagePreview: 'Bild Vorschau',
      noImage: 'Kein Bild',
      // Listen-Seite Ergänzungen
      loadError: 'Produktliste konnte nicht geladen werden. Details in Server-Logs.',
      productsListed: 'Produkte gefunden',
      filteredSuffix: ' (gefiltert)',
      noProductsFoundFilter: 'Keine Produkte für diese Filter gefunden',
      noProductsYet: 'Noch keine Produkte hinzugefügt',
      noProductsYetHint: 'Verwenden Sie die Schaltfläche "Neues Produkt hinzufügen", um zu beginnen.',
      unknownCategory: 'Ohne Kategorie',
      statusActive: 'Aktiv',
      statusInactive: 'Inaktiv',
      stockBadges: {
        sufficient: 'Ausreichend',
        low: 'Niedrig',
        out: 'Nicht vorrätig',
      },
      tableHeaders: {
        productName: 'Produktname',
        sku: 'Artikelnummer',
        category: 'Kategorie',
        stock: 'Lagerbestand',
        customerPrice: 'Preis (Kunde)',
        status: 'Status',
        actions: 'Aktionen',
        editSrOnly: 'Bearbeiten',
      },
      filter: {
        searchPlaceholder: 'Produktname oder Artikelnummer suchen...',
        searchButton: 'Suchen',
        filterLabel: 'Filter:',
        allCategories: 'Alle Kategorien',
        allStatuses: 'Alle Status',
        allStocks: 'Alle Lagerbestände',
        statusActiveLabel: 'Aktiv',
        statusInactiveLabel: 'Inaktiv',
        stockCriticalLabel: 'Kritisch',
        stockOutLabel: 'Aufgebraucht',
        stockSufficientLabel: 'Ausreichend',
        clearFilters: 'Filter zurücksetzen',
        active: {
          searchPrefix: 'Suche:',
          categoryFiltered: 'Kategorie gefiltert',
          statusPrefix: 'Status:',
          stockPrefix: 'Lager:',
        }
      },
      pagination: {
        prev: 'Zurück',
        next: 'Weiter',
        showing: 'Zeige',
        to: 'bis',
        of: 'von',
        products: 'Produkten'
      }
    },
    ordersPage: {
      title: 'Alle Bestellungen',
      orderId: 'Bestell-Nr.',
      company: 'Firma',
      date: 'Datum',
      customer: 'Kunde (User ID)',
      total: 'Gesamt (Brutto)',
      status: 'Status',
      actions: 'Aktionen',
      viewDetails: 'Details ansehen',
      updateStatus: 'Status aktualisieren',
      markShipped: 'Als versandt markieren',
      markDelivered: 'Als zugestellt markieren',
      noOrdersYet: 'Keine Bestellungen vorhanden',
      noOrdersFoundFilter: 'Keine Bestellungen für Filter gefunden',
      tryChangingFilters: 'Versuchen Sie, Ihre Filterkriterien zu ändern.',
      ordersListed: 'Bestellungen gefunden',
      // Filter labels
      searchLabel: 'Suchen (Bestell-Nr. / Firma)',
      searchPlaceholder: 'Bestell-Nr. oder Firmenname...',
      statusLabel: 'Status',
      statusAllOption: 'Alle Status',
      companyLabel: 'Firma',
      companyAllOption: 'Alle Firmen',
  unknownCompany: 'Unbekannt',
      reorderButton: "Erneut bestellen",
      cancelButton: "Bestellung stornieren",
      cancellingButton: "Wird storniert...",
statusOptions: {
                "Beklemede": "Ausstehend", // oder "Neu" / "Wartend"
                "Hazırlanıyor": "In Bearbeitung",
                "Yola Çıktı": "Versandt",
                "Teslim Edildi": "Zugestellt",
                "İptal Edildi": "Storniert"
            },
      orderDetailModal: {
        title: 'Bestelldetails',
        products: 'Produkte',
        quantity: 'Menge',
        price: 'Preis',
        subtotal: 'Zwischensumme',
        shippingAddress: 'Lieferadresse',
      },
    },
    dashboardPage: {
      managerTitle: "CEO Cockpit",
      managerSubtitle: "Willkommen zur Live-Übersicht deines Unternehmens.",
      teamMemberTitle: "Mein Persönliches Panel",
      teamMemberSubtitle: "Hier ist, worauf du dich heute konzentrieren solltest.",
      cardRevenueThisMonth: "Umsatz (Dieser Monat)",
      cardNetProfitThisMonth: "Nettogewinn (Dieser Monat)",
      cardActiveOrders: "Aktive Bestellungen",
      cardCriticalStock: "Kritischer Lagerbestand",
      agendaTitle: "Agenda & Dringende Aufgaben",
      overdueTasks: "überfällige Aufgaben gefunden.",
      quickActionsTitle: "Schnellaktionen",
      actionNewOrder: "Neue Bestellung",
      actionNewCompany: "Neue Firma",
      actionNewExpense: "Neue Ausgabe",
      cardOpenTasks: "Mir zugewiesene offene Aufgaben",
      cardNewOrdersFromClients: "Neue Bestellungen von meinen Kunden",
      quickAccessTitle: "Schnellzugriff",
      linkMyClients: "Meine Kunden",
      linkMyTasks: "Meine Aufgaben",
      errorLoadingTeamDashboard: "Dein persönliches Panel konnte nicht geladen werden.",
    },
    // KPI und operationelle Texte
    kpiRevenueMtd: 'Umsatz MTD (Netto)',
    kpiGrossMargin: 'Bruttomarge',
    kpiAov: 'Durchschnittlicher Bestellwert',
    kpiOrdersToday: 'Bestellungen heute',
    kpiOverdueInvoices: 'Überfällige Rechnungen',
    orderBreakdownTitle: 'Bestellstatus Verteilung (30 Tage)',
  },
  search: {
    placeholder: 'Suchen Sie nach Produkten, Rezepten und mehr...',
    close: 'Schließen',
    modalPlaceholder: 'Wonach suchen Sie?',
    searchButton: 'Suchen',
  },
  topBar: {
    announcement: 'Premium-Qualität, zugänglich gemacht.',
  },
  dashboard: {
    managerTitle: "CEO Cockpit",
    managerSubtitle: "Willkommen zur Live-Übersicht deines Unternehmens.",
    teamMemberTitle: "Mein Persönliches Panel",
    teamMemberSubtitle: "Hier ist, worauf du dich heute konzentrieren solltest.",
    cardRevenueThisMonth: "Umsatz (Dieser Monat)",
    cardNetProfitThisMonth: "Nettogewinn (Dieser Monat)",
    cardActiveOrders: "Aktive Bestellungen",
    cardCriticalStock: "Kritischer Lagerbestand",
    agendaTitle: "Agenda & Dringende Aufgaben",
    overdueTasks: "überfällige Aufgaben gefunden.",
    quickActionsTitle: "Schnellaktionen",
    actionNewOrder: "Neue Bestellung",
    actionNewCompany: "Neue Firma",
    actionNewExpense: "Neue Ausgabe",
    cardOpenTasks: "Mir zugewiesene offene Aufgaben",
    cardNewOrdersFromClients: "Neue Bestellungen von meinen Kunden",
    quickAccessTitle: "Schnellzugriff",
    linkMyClients: "Meine Kunden",
    linkMyTasks: "Meine Aufgaben",
    errorLoadingTeamDashboard: "Dein persönliches Panel konnte nicht geladen werden.",
    actionNewProduct: "Neues Produkt",
    actionNewTask: "Neue Aufgabe",
    viewAllTasks: "Alle Aufgaben anzeigen",
    noOverdueTasks: "Aktuell keine überfälligen Aufgaben.",
    dueDate: "Fällig am:",
    viewCriticalStockLink: "Kritische Artikel ansehen",
    financialOverview: "Finanzübersicht (Dieser Monat)",
    loadingFinancialData: "Finanzdaten werden geladen...",
    viewOrdersText: "Bestellungen anzeigen",
    viewActiveOrders: "Offene Bestellungen ansehen",
  },
  marketingKit: {
    title: 'Ihr Marketing- & Menü-Kit',
    description: 'Nutzen Sie unsere professionellen Materialien, um ElysonSweets-Produkte in Ihrem Geschäft zu bewerben.', // KORRIGIERT: Name geändert
    assets: [{
      name: 'Produktfotos (Hohe Auflösung)',
      type: 'Bilder',
      action: 'Herunterladen'
    }, {
      name: 'Menüvorlagen (PDF)',
      type: 'Dokumente',
      action: 'Herunterladen'
    }, {
      name: 'Social Media Posts (Vorlage)',
      type: 'Vorlagen',
      action: 'Herunterladen'
    }, ]
  },
  portalLoginPage: {
    title: 'Willkommen zurück, Partner.',
    subtitle: 'Bitte melden Sie sich an, um auf Ihr exklusives Dashboard zuzugreifen.',
    emailLabel: 'E-Mail-Adresse',
    passwordLabel: 'Passwort',
    loginButton: 'Anmelden',
    forgotPassword: 'Passwort vergessen?',
    registerPrompt: 'Noch kein Partner?',
    registerLink: 'Jetzt registrieren.',
    welcomeTitle: 'Exklusiver Zugang für unsere Geschäftspartner',
    welcomeText: 'Profitieren Sie von exklusiven Preisen, Marketingmaterialien und einem engagierten Support-Team, das Ihnen zum Erfolg verhilft.',
  },
  registerPage: {
    title: 'Werden Sie ElysonSweets-Partner',
    subtitle: 'Füllen Sie das Antragsformular aus und werden Sie Teil unseres exklusiven Netzwerks.',
    companyName: 'Name des Unternehmens',
    contactPerson: 'Ansprechpartner',
    email: 'E-Mail-Adresse',
    phone: 'Telefonnummer (Optional)',
    address: 'Adresse (Optional)',
    vatId: 'Umsatzsteuer-ID (Optional)',
    message: 'Ihre Nachricht an uns (Optional)',
    submitButton: 'Antrag Senden',
    submitting: 'Wird gesendet...',
    successTitle: 'Vielen Dank!',
    successMessage: 'Ihr Antrag wurde erfolgreich übermittelt. Wir werden ihn prüfen und uns in Kürze bei Ihnen melden.',
    backToLogin: 'Zurück zum Login',
  },
  newOrderPage: {
    title: 'Neue Bestellung aufgeben',
    searchPlaceholder: 'Produkt suchen...',
    product: 'Produkt',
    price: 'Preis',
    quantity: 'Menge',
    subtotal: 'Zwischensumme',
    addToCart: 'Hinzufügen',
    orderSummary: 'Bestellübersicht',
    total: 'Gesamtbetrag',
    placeOrder: 'Bestellung aufgeben',
    noItems: 'Noch keine Artikel im Warenkorb.',
    stock: 'Lagerbestand:',
  },
  megaMenu: {
    promo: {
      title: 'Produkt des Monats',
      description: 'Entdecken Sie unseren neuen Pistazien-Himbeer-Traum.',
      button: 'Jetzt ansehen',
      href: '/produkte/torten-kuchen/pistazie-himbeer',
      imageAlt: 'Ein köstliches Stück Pistazien-Himbeer-Torte',
      imageUrl: 'https://images.unsplash.com/photo-1565958011703-4f9829ba187?q=80&w=1965&auto=format&fit=crop'
    },
    mainCategories: [{
      name: 'Torten & Kuchen',
      promoImage: 'https://images.unsplash.com/photo-1627834392233-5a0242416f1c?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Cheesecakes',
        href: '/produkte/cheesecakes',
        description: ''
      }, {
        name: 'Brownies',
        href: '/produkte/brownies',
        description: ''
      }, {
        name: 'Tiramisu',
        href: '/produkte/tiramisu',
        description: ''
      }, {
        name: 'Becher-Kuchen',
        href: '/produkte/cup-cakes',
        description: ''
      }, {
        name: 'Vegane Kuchen',
        href: '/produkte/vegan-cakes',
        description: ''
      }, {
        name: 'Glutenfrei',
        href: '/produkte/gluten-free',
        description: ''
      }, ]
    }, {
      name: 'Kekse & Muffins',
      promoImage: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Kekse',
        href: '/produkte/cookies',
        description: ''
      }, {
        name: 'Muffins',
        href: '/produkte/muffins',
        description: ''
      }, ]
    }, {
      name: 'Pizza & Fast Food',
      promoImage: 'https://images.unsplash.com/photo-1594007654729-407eedc4be65?q=80&w=1928&auto=format&fit=crop',
      subCategories: [{
        name: 'Pizzen',
        href: '/produkte/pizzas',
        description: ''
      }, {
        name: 'Fast Food',
        href: '/produkte/fast-food',
        description: ''
      }, ]
    }, {
      name: 'Saucen & Zutaten',
      promoImage: 'https://images.unsplash.com/photo-1621263765183-59b43fac3388?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Dessert-Saucen',
        href: '/produkte/dessert-sauces',
        description: ''
      }, {
        name: 'Toppings',
        href: '/produkte/toppings',
        description: ''
      }, {
        name: 'Zutaten',
        href: '/produkte/ingredients',
        description: ''
      }, ]
    }, {
      name: 'Kaffee',
      promoImage: 'https://images.unsplash.com/photo-1511920183353-3c2c5d7d5d99?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Türkischer Kaffee',
        href: '/produkte/turkish-coffee',
        description: ''
      }, {
        name: 'Filterkaffee',
        href: '/produkte/filter-coffee',
        description: ''
      }, {
        name: 'Espresso',
        href: '/produkte/espresso',
        description: ''
      }, ]
    }, {
      name: 'Getränke',
      promoImage: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1974&auto=format&fit=crop',
      subCategories: [{
        name: 'Heiße Schokolade',
        href: '/produkte/hot-chocolate',
        description: ''
      }, {
        name: 'Tee',
        href: '/produkte/tea',
        description: ''
      }, {
        name: 'Sirupe',
        href: '/produkte/syrups',
        description: ''
      }, {
        name: 'Salep',
        href: '/produkte/salep',
        description: ''
      }, ]
    }, ]
  },
  philosophy: {
    title: 'Unsere Philosophie',
    paragraph1: 'Bei ElysonSweets glauben wir, dass wahrer Luxus in der kompromisslosen Qualität der Zutaten und der leidenschaftlichen Handwerkskunst unserer Meisterkonditoren liegt.',
    paragraph2: 'Jede Kreation ist ein Versprechen – ein unvergessliches Geschmackserlebnis, das aus Tradition geboren und für den modernen Gaumen perfektioniert wurde.',
    imageAlt: 'ElysonSweets tarafından özel olarak hazırlanmış, arka fonsuz bir pasta görseli',
  },
  categories: {
    title: 'Unsere Produktkategorien',
    subtitle: 'Entdecken Sie unsere exquisite Auswahl an Premium-Qualität',
    cakes: 'Torten & Kuchen',
    desserts: 'Pralinen & Macarons',
    pastries: 'Feingebäck',
    cakes_alt: 'Ein Stück köstlicher Schokoladenkuchen',
    desserts_alt: 'Bunte Macarons',
    pastries_alt: 'Frisch gebackene Croissants',
  },
  testimonials: {
    title: 'Stimmen unserer Partner',
    review1: 'Die Qualität und Kreativität von ElysonSweets hat unser Café auf ein neues Level gehoben. Unsere Kunden lieben die Desserts!',
    name1: 'Anna Schmidt',
    company1: 'Inhaberin, Café Bellevue',
    review2: 'Zuverlässige Lieferung und konstant herausragende Produkte. ElysonSweets ist für unsere Events ein unverzichtbarer Partner geworden.',
    name2: 'Maximilian Huber',
    company2: 'Eventmanager, Huber & Co.',
    review3: 'Vom ersten Kontakt bis zur Lieferung – absolute Professionalität. Die Patisserie ist nicht nur lecker, sondern auch ein Kunstwerk.',
    name3: 'Sophia Weber',
    company3: 'Chefköchin, Restaurant "Zur Eiche"',
  },
  cta: {
    title: 'Bereit, Ihr Angebot zu veredeln?',
    subtitle: 'Werden Sie Teil unseres exklusiven Partnernetzwerks und erhalten Sie Zugang zu Premium-Produkten, die Ihre Kunden begeistern werden.',
    button: 'Jetzt Partner Werden',
  },
  socials: {
    instagram: 'Folgen Sie uns auf Instagram',
    facebook: 'Finden Sie uns auf Facebook',
    linkedin: 'Vernetzen Sie sich mit uns auf LinkedIn',
    followUs: 'Folgen Sie uns',
  },
  hero: {
    title: 'Handwerkskunst, die ',
    highlight: 'Ihre Gäste verzaubert.',
    subtitle: 'Erlesene Patisserie-Kreationen, die Luxus neu definieren – zugänglich für Ihr Unternehmen.',
    button: 'Partner Werden',
    b2bNote: 'Verkauf nur an Gewerbetreibende / B2B Only',
    mainHeadline: 'Köln’s neuer Partner für Premium-Desserts',
    subHeadline: 'Wir bringen exklusive ElysonSweets Qualität in Ihr Café.',
    valueProposition: 'Fordern Sie jetzt Ihr kostenloses Probierpaket an und überzeugen Sie sich von unserer Qualität.',
    ctaButton: 'Produkte entdecken',
  },
  footer: {
    legal: 'Rechtliches',
    impressum: 'Impressum',
    datenschutz: 'Datenschutz',
    copyright: '© 2025 ElysonSweets Germany. Alle Rechte vorbehalten.',
    locationNote: 'Standort: Köln – Vollständige Adressinformationen folgen in Kürze',
  },
  logoAlt: 'ElysonSweets Logo',
  productDetailPage: {
    description: 'Beschreibung',
    ingredients: 'Zutaten',
    allergens: 'Allergene',
    addToCart: 'Zum Warenkorb hinzufügen',
    tabDescription: 'Beschreibung',
    tabDetails: 'Produktdetails',
    tabHandling: 'Lagerung & Handhabung',
    sliceCount: 'Stückzahl',
    weight: 'Gewicht',
    portionSize: 'Portionsgröße',
    storageConditions: 'Lagerbedingungen',
    storageDuration: 'Lagerdauer',
    thawingTime: 'Auftauzeit',
    shelfLife: 'Haltbarkeit (aufgetaut)',
    sampleProduct: {
      id: 1, name: 'Fıstık Rüyası', category: 'Torten & Kuchen', price: '45,00 €',
      mainImage: 'https://...87',
      gallery: [ 'https://...400', 'https://...400', 'https://...400' ],
      descriptionText: 'Kakaobiskuit, Mousse von Zartbitterschokolade, Ganache von weißer Schokolade, dragierte Pistazien...',
      ingredientsList: 'Dunkle Schokolade, Weizenmehl, Bio-Eier, Rohrzucker, frische Sahne, Butter, Pistazien.',
      allergensList: 'Kann Spuren von Nüssen enthalten. Enthält Gluten, Eier und Milchprodukte.',
      technicalDetails: { sliceCount: '12 Stück', weight: '1540 g ± 5 g', portionSize: '128 g ± 5 g', },
      storageInfo: { conditions: 'bei -18 °C', duration: '12 Monate', thawingTime: '3-3,5 Stunden bei +4 °C', shelfLife: '3-4 Tage bei +4 °C', }
    }
  },
  productsPage: {
    title: 'Unsere Kollektionen',
    filterTitle: 'Kategorien filtern',
    allProducts: 'Alle Produkte',
    sampleProducts: [
        { id: 1, name: 'Klassische Schokoladentorte', category: 'Torten & Kuchen', imageUrl: 'https://...87', alt: 'Ein Stück Schokoladenkuchen' },
        { id: 2, name: 'Französische Macarons', category: 'Pralinen & Macarons', imageUrl: 'https://...9e', alt: 'Bunte Macarons' },
        { id: 3, name: 'Frische Croissants', category: 'Feingebäck', imageUrl: 'https://...cd', alt: 'Frisch gebackene Croissants' },
        { id: 4, name: 'Äthiopischer Yirgacheffe', category: 'Kaffee & Tee', imageUrl: 'https://...f3', alt: 'Eine Tasse Kaffee' },
        { id: 5, name: 'Vegane Himbeertorte', category: 'Vegane Produkte', imageUrl: 'https://...2a', alt: 'Ein Stück veganer Himbeerkuchen' },
        { id: 6, name: 'Gourmet Salami Pizza', category: 'Gourmet Pizza', imageUrl: 'https://...91', alt: 'Eine Gourmet-Salami-Pizza' },
    ],
    detailsButton: 'Details ansehen',
  },
  productsForm: {
    createTitle: 'Produkt erstellen',
    editTitle: 'Produkt bearbeiten',
    createSubtitle: 'Füllen Sie die Felder aus, um ein neues Produkt hinzuzufügen.',
    editSubtitle: 'Passen Sie die Informationen an und speichern Sie Ihre Änderungen.',
    backButtonAria: 'Zur Produktliste zurück',
    imageSection: {
      title: 'Bilder',
      mainImage: 'Hauptbild',
      change: 'Ändern',
      upload: 'Hochladen',
      formatsHint: 'PNG, JPG oder WEBP bis 2MB.',
      galleryImages: 'Galeriebilder',
      addImages: 'Bilder hinzufügen'
    },
    basicsSection: {
      title: 'Grundinformationen',
      mainCategory: 'Hauptkategorie',
      subCategory: 'Unterkategorie',
      pleaseSelect: 'Bitte wählen…',
      selectMainFirst: 'Zuerst eine Hauptkategorie wählen',
      noSubcategories: 'Keine Unterkategorien',
      unnamedCategory: 'Unbenannte Kategorie',
      changeCategoryWarning: 'Ein Kategorienwechsel kann technische Felder und Attribute verändern.'
    },
    supplierSection: {
      supplier: 'Lieferant',
      none: 'Keiner'
    },
    i18nSection: {
      title: 'Mehrsprachige Inhalte',
      productName: 'Produktname',
      description: 'Beschreibung',
      languageNames: { de: 'Deutsch', en: 'Englisch', tr: 'Türkisch', ar: 'Arabisch' }
    },
    operationsSection: {
      title: 'Operationen',
      sku: 'SKU / Lagercode',
      slug: 'Slug',
      unit: 'Verkaufseinheit',
      pleaseSelect: 'Bitte wählen…',
      activeQuestion: 'Aktiv und sichtbar?'
    },
    pricingStockSection: {
      title: 'Preise & Lager',
      stockQty: 'Lagermenge',
      stockThreshold: 'Mindestbestand-Warnung',
      customerPrice: 'Kundenpreis',
      resellerPrice: 'Händlerpreis',
      distributorCost: 'Distributionskosten'
    },
    attributesSection: {
      title: 'Attribute',
      info: 'Wählen Sie zutreffende Attribute und Geschmacksrichtungen für Filterung und Anzeige.',
      features: 'Merkmale',
      vegan: 'Vegan',
      vegetarian: 'Vegetarisch',
      glutenFree: 'Glutenfrei',
      lactoseFree: 'Laktosefrei',
      organic: 'Bio'
    },
    flavorsSection: {
      label: 'Geschmacksrichtungen',
      extraLabel: 'Weitere Geschmacksrichtungen (kommagetrennt)',
      extraPlaceholder: 'z. B. Banane, karamellisierte Feige'
    },
    technicalSection: {
      title: 'Technische Details'
    },
    buttons: {
      cancel: 'Abbrechen',
      saveCreate: 'Produkt anlegen',
      saveEdit: 'Änderungen speichern',
      saving: 'Wird gespeichert…',
      delete: 'Löschen'
    },
    deleteConfirm: '„%{name}“ löschen? Dies kann nicht rückgängig gemacht werden.',
    flavors: {
      schokolade: 'Schokolade',
      kakao: 'Kakao',
      erdbeere: 'Erdbeere',
      vanille: 'Vanille',
      karamell: 'Karamell',
      nuss: 'Nuss',
      walnuss: 'Walnuss',
      badem: 'Mandel',
      hindistancevizi: 'Kokosnuss',
      honig: 'Honig',
      tereyag: 'Butter',
      zitrone: 'Zitrone',
      portakal: 'Orange',
      zeytin: 'Olive',
      frucht: 'Frucht',
      waldfrucht: 'Waldfrucht',
      kaffee: 'Kaffee',
      himbeere: 'Himbeere',
  brombeere: 'Brombeere',
      pistazie: 'Pistazie',
      kirsche: 'Kirsche',
      havuc: 'Karotte',
      yulaf: 'Hafer',
      yabanmersini: 'Heidelbeere'
    }
  },
  productsProfessionalFilter: {
    searchPlaceholder: 'Produktname oder Artikelnummer suchen...',
    categoryLabel: 'Kategorie',
    allCategories: 'Alle Kategorien',
    portionLabel: 'Portionen',
    allPortions: 'Alle Portionen',
    featureLabel: 'Merkmale',
    allFeatures: 'Alle Merkmale',
    tasteLabel: 'Geschmack',
    allTastes: 'Alle Geschmacksrichtungen',
    applyFilters: 'Filter anwenden',
    clearFilters: 'Zurücksetzen',
  activeFiltersBadgeSingular: '%{count} Filter aktiv',
  activeFiltersBadgePlural: '%{count} Filter aktiv',
    featureOptions: {
      vegan: 'Vegan',
      vegetarian: 'Vegetarisch',
      glutenFree: 'Glutenfrei',
      lactoseFree: 'Laktosefrei',
      organic: 'Bio',
      sugarFree: 'Ohne Zucker'
    },
    tasteOptions: {
      schokolade: 'Schokolade',
      kakao: 'Kakao',
      erdbeere: 'Erdbeere',
      vanille: 'Vanille',
      karamell: 'Karamell',
      nuss: 'Nuss',
      walnuss: 'Walnuss',
      badem: 'Mandel',
      hindistancevizi: 'Kokosnuss',
      honig: 'Honig',
      tereyag: 'Butter',
      zitrone: 'Zitrone',
      portakal: 'Orange',
      zeytin: 'Olive',
      frucht: 'Frucht',
      waldfrucht: 'Waldfrucht',
      kaffee: 'Kaffee',
      himbeere: 'Himbeere',
  brombeere: 'Brombeere',
      pistazie: 'Pistazie',
      kirsche: 'Kirsche',
      havuc: 'Karotte',
      yulaf: 'Hafer',
      yabanmersini: 'Heidelbeere'
    }
  },
  pagination: {
    page: 'Seite',
    of: 'von',
    next: 'Nächste',
    previous: 'Vorherige',
  },
  qualityPromise: {
    title: 'Unser Qualitätsversprechen',
    item1: { title: 'Beste Zutaten', description: 'Wir wählen nur die feinsten und frischesten Rohstoffe von vertrauenswürdigen Lieferanten aus.', },
    item2: { title: 'Geprüfte Markenqualität', description: 'Als Distributor beziehen wir ausschließlich von zertifizierten Herstellern – mit konstanter Serienqualität, lückenloser Rückverfolgbarkeit und verlässlichen Produktspezifikationen.', },
    item3: { title: 'Zuverlässige Lieferung', description: 'Wir garantieren eine pünktliche und sorgfältige Lieferung, damit Ihre Ware stets in perfektem Zustand ankommt.', },
  },
  certifications: {
    title: 'Zertifizierungen & Standards',
    brc: {
      label: 'BRC-zertifiziert',
      description: 'Zertifizierte Lebensmittelsicherheit nach BRC Global Standard.'
    },
    halal: {
      label: 'Halal-zertifiziert',
      description: 'Produkte mit offiziell bestätigter Halal-Konformität.'
    }
  },
  datenschutzPage: {
    title: 'Datenschutzerklärung',
    lastUpdated: 'Stand: 01. Oktober 2025',
    p1: 'Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.',
    p2: 'Die Nutzung unserer Webseite ist in der Regel ohne Angabe personenbezogener Daten möglich. Soweit auf unseren Seiten personenbezogene Daten (beispielsweise Name, Anschrift oder E-Mail-Adressen) erhoben werden, erfolgt dies, soweit möglich, stets auf freiwilliger Basis.',
    sectionTitle1: '1. Verantwortliche Stelle',
    responsibleBody: 'Verantwortliche Stelle im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:',
    companyDetails: [ 'ElysonSweets GmbH', 'Köln, Deutschland', 'E-Mail: info@elysonsweets.de', 'Vollständige Adresse wird in Kürze bekannt gegeben' ],
    sectionTitle2: '2. Ihre Betroffenenrechte',
    rightsIntro: 'Unter den angegebenen Kontaktdaten unseres Datenschutzbeauftragten können Sie jederzeit folgende Rechte ausüben:',
    rightsList: [ 'Auskunft über Ihre bei uns gespeicherten Daten und deren Verarbeitung,', 'Berichtigung unrichtiger personenbezogener Daten,', 'Löschung Ihrer bei uns gespeicherten Daten,', 'Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen,', 'Widerspruch gegen die Verarbeitung Ihrer Daten bei uns und', 'Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben oder einen Vertrag mit uns abgeschlossen haben.', ],
    p3: 'Sofern Sie uns eine Einwilligung erteilt haben, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.'
  },
  impressumPage: {
    title: 'Impressum',
    section1Title: 'Angaben gemäß § 5 TMG',
    address: [ 'ElysonSweets GmbH', 'Köln, Deutschland', 'Vollständige Adresse wird in Kürze bekannt gegeben' ],
    section2Title: 'Vertreten durch',
    managingDirector: 'Turgay Celen',
    section3Title: 'Kontakt',
    email: 'E-Mail: info@elysonsweets.de',
    section4Title: 'Registereintrag',
    registerNote: 'Handelsregistereintrag wird in Kürze aktualisiert',
    section5Title: 'Umsatzsteuer-ID',
    vatNote: 'Umsatzsteuer-Identifikationsnummer wird nach Registrierung bekannt gegeben',
    section6Title: 'Haftungsausschluss',
    disclaimerText: 'Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.',
  },
  contactPage: {
    title: 'Kontakt aufnehmen',
    heroSubtitle: 'WIR FREUEN UNS, VON IHNEN ZU HÖREN',
    formTitle: 'Senden Sie uns eine Nachricht',
    formName: 'Ihr Name',
    formEmail: 'Ihre E-Mail-Adresse',
    formMessage: 'Ihre Nachricht',
    formButton: 'Nachricht Senden',
    detailsTitle: 'Direkter Kontakt',
    address: 'Musterstraße 123, 12345 Berlin, Deutschland',
    phone: '+49 (0) 123 456 789',
    email: 'info@ElysonSweets.de',
  },
  orderStatuses: {
    // Legacy English keys
    processing: 'In Vorbereitung',
    shipped: 'Versandt',
    delivered: 'Zugestellt',
    cancelled: 'Storniert',
    // Turkish DB keys
    'Beklemede': 'Ausstehend',
    'Hazırlanıyor': 'In Bearbeitung',
    'Yola Çıktı': 'Versandt',
    'Teslim Edildi': 'Zugestellt',
    'İptal Edildi': 'Storniert',
  },
  tasksPage: {
    title: 'Aufgabenverwaltung',
    tasksListed: 'Aufgaben gelistet.',
    newTask: 'Neue Aufgabe',
    filterStatusLabel: 'Status',
    filterAssigneeLabel: 'Zugewiesen an',
    filterPriorityLabel: 'Priorität',
    statusAll: 'Alle',
    assigneeAll: 'Alle Mitarbeiter',
    priorityAll: 'Alle Prioritäten',
    openTasksOption: 'Offene Aufgaben',
    completedTasksOption: 'Abgeschlossene Aufgaben',
    noTasksTitle: 'Noch keine Aufgaben vorhanden',
    noTasksFilterTitle: 'Keine passenden Aufgaben gefunden',
    noTasksDesc: 'Fügen Sie eine neue Aufgabe hinzu, um zu beginnen.',
    noTasksFilterDesc: 'Ändern Sie Ihre Filterkriterien.',
    columnTask: 'Aufgabe',
    columnAssignee: 'Zugewiesen an',
    columnPriority: 'Priorität',
    columnDue: 'Fällig am',
    columnStatus: 'Status',
    columnAction: 'Aktion',
    statusOpen: 'Offen',
    statusCompleted: 'Abgeschlossen'
  },
  adminPartners: {
    title: "Partner-Verwaltung",
    partnerId: "Partner-ID",
    companyName: "Firma",
    contactPerson: "Ansprechpartner",
    status: "Vertriebsstatus",
    createdAt: "Erstellt am",
    viewApplicationsButton: "Neue Partner erstellen",
    noPartners: "Es sind keine aktiven Partner vorhanden.",
    deleteConfirmation: "Möchten Sie diesen Partner wirklich löschen?",
    createPartnerButton: "Neuen Partner erstellen",
  },
  admin: {
    finans: {
      giderlerPage: {
        title: "Ausgabenverwaltung",
        description: "Alle Betriebsausgaben auflisten und verwalten.",
        newExpense: "Neue Ausgabe",
        filterByHauptCategory: "Nach Hauptkategorie filtern",
        filterByCategory: "Nach Ausgabenposten filtern",
        allCategories: "Alle Hauptkategorien",
        allSubCategories: "Alle Posten",
        date: "Datum",
        hauptCategory: "Hauptkategorie",
        category: "Ausgabenposten",
        descriptionCol: "Beschreibung",
        amount: "Betrag",
        frequency: "Häufigkeit",
        recordedBy: "Erfasst von",
        actions: "Aktionen",
        edit: "Bearbeiten",
        delete: "Löschen",
        duplicate: "Duplizieren",
        confirmDelete: "Möchten Sie diese Ausgabe wirklich löschen?",
        deleteSuccess: "Ausgabe gelöscht.",
        deleteError: "Fehler beim Löschen:",
        noExpensesFoundFilter: "Für diese Filter wurden keine Ausgaben gefunden.",
        noExpensesYet: "Noch keine Ausgaben erfasst.",
        templateManage: "Vorlagen verwalten",
        copyFromLastMonth: "Vom Vormonat kopieren",
        copying: "Wird kopiert...",
        createFromTemplates: "Aus Vorlagen erstellen",
        confirmCopy: "⚠️ Möchten Sie ALLE Ausgaben des Vormonats in diesen Monat kopieren?\n\nDieser Vorgang kann nicht rückgängig gemacht werden!",
        copySuccess: "%{count} Ausgaben erfolgreich kopiert!",
        copyError: "Kopieren fehlgeschlagen.",
        confirmCreateFromTemplates: "✅ Möchten Sie Entwurfsausgaben aus Vorlagen erstellen?\n\nDieser Vorgang erstellt Entwurfsausgaben aus allen aktiven Vorlagen.\nSie müssen die erstellten Ausgaben noch genehmigen.",
        createSuccess: "%{count} Entwurfsausgaben erstellt!",
        createError: "Erstellung fehlgeschlagen.",
        approveSelected: "Ausgewählte genehmigen",
        confirmApprove: "✅ Möchten Sie %{count} Entwurfsausgaben genehmigen?\n\nGenehmigte Ausgaben werden in Berichten angezeigt.",
        approveSuccess: "%{count} Ausgaben genehmigt!",
        approveError: "Genehmigung fehlgeschlagen.",
        selectError: "Bitte wählen Sie zu genehmigende Ausgaben aus.",
        selectAllDrafts: "Alle Entwürfe auswählen",
        filters: "Filter",
        resetFilters: "Zurücksetzen",
        period: "Zeitraum:",
        periodThisMonth: "Dieser Monat",
        periodLastMonth: "Letzter Monat",
        periodThisYear: "Dieses Jahr",
        periodCustom: "Benutzerdefiniert",
        dateFrom: "Von:",
        dateTo: "Bis:",
        statusFilter: "Status:",
        statusAll: "Alle",
        statusDraft: "Entwurf",
        statusApproved: "Genehmigt",
        applyFilters: "Filter anwenden",
        itemsSelected: "%{count} Ausgaben ausgewählt",
        totalAmount: "Gesamtbetrag:",
        noData: "Keine Daten",
        loading: "Lädt...",
        showingExpenses: "%{filtered} von %{total} Ausgaben werden angezeigt",
        status: "Status",
      }
    }
  },
}; // <-- DIESE KLAMMER IST DIE LETZTE.